'use server';

import {
  BET_TYPES,
  calculatePayoutRate,
  Finisher,
  getWinningCombinations,
  isRefundedBet,
  isWinningBet,
  normalizeSelections,
  ODDS_UNIT,
} from '@/entities/bet';
import type { NetkeibaPayoutEntry } from '@/features/admin/import-race/model/types';
import { DEFAULT_GUARANTEED_ODDS } from '@/shared/constants/odds';
import { db } from '@/shared/db';
import { bets, payoutResults as payoutResultsTable, raceEntries, raceInstances } from '@/shared/db/schema';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { ActionError, requireAdmin, revalidateRacePaths, runAction } from '@/shared/utils/admin';
import { eq, sql, SQL } from 'drizzle-orm';

// 着順を確定して払戻を計算する。未締切・確定済みなどの想定内エラーは throw せず
// { success: false, error } で返す（本番では throw のメッセージがマスクされるため）。
export async function finalizeRace(
  raceId: string,
  results: { entryId: string; finishPosition: number }[],
  netkeibaPayouts?: Partial<Record<string, NetkeibaPayoutEntry[]>>
) {
  return runAction(() => finalizeRaceInner(raceId, results, netkeibaPayouts));
}

async function finalizeRaceInner(
  raceId: string,
  results: { entryId: string; finishPosition: number }[],
  netkeibaPayouts?: Partial<Record<string, NetkeibaPayoutEntry[]>>
) {
  await requireAdmin();

  let rankingPayload: {
    finishPosition: number;
    horseNumber: number;
    bracketNumber: number;
    horseName: string;
  }[] = [];

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`payout:${raceId}`}))`);

    const raceInstance = await tx.query.raceInstances.findFirst({
      where: eq(raceInstances.id, raceId),
      columns: { status: true, guaranteedOdds: true },
    });

    if (!raceInstance) {
      throw new ActionError('レースが見つかりません');
    }

    if (raceInstance.status === 'FINALIZED') {
      throw new ActionError('払戻確定済みのため着順を変更できません');
    }

    if (raceInstance.status !== 'CLOSED') {
      throw new ActionError('レースが締切状態ではありません');
    }

    if (results.length > 0) {
      const sqlChunks: SQL[] = [];

      sqlChunks.push(sql`(case`);
      for (const result of results) {
        sqlChunks.push(sql`when ${raceEntries.id} = ${result.entryId} then ${result.finishPosition}`);
      }
      sqlChunks.push(sql`else ${raceEntries.finishPosition} end)`);

      const finalSql: SQL = sql.join(sqlChunks, sql` `);

      await tx.update(raceEntries).set({ finishPosition: finalSql }).where(eq(raceEntries.raceId, raceId));
    }

    const raceEntriesWithInfo = await tx.query.raceEntries.findMany({
      where: eq(raceEntries.raceId, raceId),
      with: { horse: true },
      orderBy: [raceEntries.finishPosition],
    });

    const finishers: Finisher[] = raceEntriesWithInfo
      .filter((e) => e.finishPosition !== null)
      .map((e) => ({
        horseNumber: e.horseNumber!,
        bracketNumber: e.bracketNumber!,
      }));

    if (finishers.length === 0) throw new ActionError('着順が指定されていません');

    const invalidHorseIds = new Set(
      raceEntriesWithInfo.filter((e) => e.status === 'SCRATCHED' || e.status === 'EXCLUDED').map((e) => e.horseNumber!)
    );

    const validBrackets = new Set(
      raceEntriesWithInfo
        .filter((e) => e.status === 'ENTRANT')
        .map((e) => e.bracketNumber!)
        .filter((b): b is number => b !== null)
    );

    rankingPayload = raceEntriesWithInfo
      .filter((e) => e.finishPosition !== null)
      .slice(0, 5)
      .map((e) => ({
        finishPosition: e.finishPosition!,
        horseNumber: e.horseNumber!,
        bracketNumber: e.bracketNumber!,
        horseName: e.horse!.name,
      }));

    const allBets = await tx.query.bets.findMany({
      where: eq(bets.raceId, raceId),
    });

    const guaranteedOdds = raceInstance.guaranteedOdds ?? undefined;

    const poolByBetType: Record<string, number> = {};
    const winningSelectionAmounts: Record<string, Record<string, number>> = {};

    for (const bet of allBets) {
      const betDetail = bet.details;
      const type = betDetail.type;

      if (isRefundedBet(type, betDetail.selections, invalidHorseIds, validBrackets)) {
        continue;
      }

      poolByBetType[type] = (poolByBetType[type] || 0) + bet.amount;

      if (isWinningBet(betDetail, finishers)) {
        const selectionKey = normalizeSelections(type, betDetail.selections);

        if (!winningSelectionAmounts[type]) winningSelectionAmounts[type] = {};
        winningSelectionAmounts[type][selectionKey] = (winningSelectionAmounts[type][selectionKey] || 0) + bet.amount;
      }
    }

    const payoutCalculationsByType: Record<string, { numbers: number[]; payout: number }[]> = {};

    if (netkeibaPayouts) {
      for (const [type, entries] of Object.entries(netkeibaPayouts)) {
        if (entries && entries.length > 0) {
          payoutCalculationsByType[type] = entries;
        }
      }
    } else {
      for (const [type, selectionAmounts] of Object.entries(winningSelectionAmounts)) {
        const totalWinningAmount = Object.values(selectionAmounts).reduce((sum, amount) => sum + amount, 0);
        const winningCount = Object.keys(selectionAmounts).length;

        if (!payoutCalculationsByType[type]) payoutCalculationsByType[type] = [];

        for (const [selectionKey, selectionAmount] of Object.entries(selectionAmounts)) {
          let rate = calculatePayoutRate(poolByBetType[type], selectionAmount, totalWinningAmount, winningCount);

          if (guaranteedOdds?.[type]) {
            rate = Math.max(rate, guaranteedOdds[type]);
          }

          const unitPayout = Math.floor(ODDS_UNIT * rate);
          // SAFETY: selectionKey は normalizeSelections が number[] を JSON.stringify したもの
          payoutCalculationsByType[type].push({ numbers: JSON.parse(selectionKey) as number[], payout: unitPayout });
        }
      }

      for (const type of Object.values(BET_TYPES)) {
        if (!payoutCalculationsByType[type]) payoutCalculationsByType[type] = [];

        const winningCombinations = getWinningCombinations(type, finishers);
        const defaultRate = guaranteedOdds?.[type] ?? DEFAULT_GUARANTEED_ODDS[type] ?? 1.0;

        for (const combination of winningCombinations) {
          const key = normalizeSelections(type, combination);
          const exists = payoutCalculationsByType[type].some((p) => normalizeSelections(type, p.numbers) === key);
          if (!exists) {
            const payout = Math.floor(ODDS_UNIT * defaultRate);
            payoutCalculationsByType[type].push({ numbers: combination, payout });
          }
        }

        payoutCalculationsByType[type] = payoutCalculationsByType[type].sort((a, b) => {
          return a.numbers.join('-').localeCompare(b.numbers.join('-'));
        });
      }
    }

    await tx.delete(payoutResultsTable).where(eq(payoutResultsTable.raceId, raceId));

    for (const [type, combinations] of Object.entries(payoutCalculationsByType)) {
      if (combinations.length > 0) {
        await tx.insert(payoutResultsTable).values({
          raceId,
          type,
          combinations,
        });
      }
    }
  });

  raceEventEmitter.emit(RACE_EVENTS.RACE_RESULT_UPDATED, {
    raceId,
    results: rankingPayload,
    timestamp: Date.now(),
  });

  revalidateRacePaths(raceId);
}
