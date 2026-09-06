'use server';

import type { BetDetail, Finisher } from '@/entities/bet';
import {
  BET_TYPES,
  calculatePayoutRate,
  getWinningCombinations,
  isRefundedBet,
  isWinningBet,
  normalizeSelections,
  ODDS_UNIT,
  parseSelectionKey,
  resolveInvalidSelections,
} from '@/entities/bet';
import { getDefaultGuaranteedOdds, resolveGuaranteedOdds } from '@/entities/race/lib/guaranteed-odds';
import type { NetkeibaPayoutEntry } from '@/features/admin/import-race/model/types';
import { db } from '@/shared/db';
import { bets, payoutResults as payoutResultsTable, raceEntries, raceInstances } from '@/shared/db/schema';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { ActionError, requireAdmin, revalidateRacePaths, runAction } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import type { SQL } from 'drizzle-orm';
import { eq, sql } from 'drizzle-orm';

/** 管理画面から渡される 1 頭分の着順入力 */
interface RaceResultInput {
  entryId: string;
  finishPosition: number;
}

/** 払戻表に載る 1 組合せ。guaranteed は保証オッズで倍率が引き上げられたときだけ立つ */
// 払戻組合せの形は payoutResults.combinations の $type が単一の管理点
type PayoutCombination = (typeof payoutResultsTable.$inferSelect)['combinations'][number];

type PayoutCalculationsByType = Record<string, PayoutCombination[]>;

/** 集計に使う最小限のベット情報 */
interface PoolBet {
  details: BetDetail;
  amount: number;
}

/** 券種別の投票総額と、的中した選択ごとの投票額 */
interface BetPools {
  poolByBetType: Record<string, number>;
  winningSelectionAmounts: Record<string, Record<string, number>>;
}

/** 着順から entryId ごとの finishPosition を割り当てる CASE 式を組む。対象外の行は元の着順を保つ */
function buildFinishPositionCase(results: RaceResultInput[]): SQL {
  const sqlChunks: SQL[] = [sql`(case`];
  for (const result of results) {
    sqlChunks.push(sql`when ${raceEntries.id} = ${result.entryId} then ${result.finishPosition}`);
  }
  sqlChunks.push(sql`else ${raceEntries.finishPosition} end)`);
  return sql.join(sqlChunks, sql` `);
}

/** 全ベットを券種別の総額と、的中選択ごとの投票額に集計する。返還対象の馬番と枠番を含むベットは除く */
function aggregateBetPools(
  allBets: PoolBet[],
  finishers: Finisher[],
  invalidHorseIds: Set<number>,
  validBrackets: Set<number>
): BetPools {
  const poolByBetType: Record<string, number> = {};
  const winningSelectionAmounts: Record<string, Record<string, number>> = {};

  for (const bet of allBets) {
    const betDetail = bet.details;
    const type = betDetail.type;

    if (isRefundedBet(type, betDetail.selections, invalidHorseIds, validBrackets)) {
      continue;
    }

    poolByBetType[type] = (poolByBetType[type] ?? 0) + bet.amount;

    if (isWinningBet(betDetail, finishers)) {
      const selectionKey = normalizeSelections(type, betDetail.selections);

      const selectionAmounts = (winningSelectionAmounts[type] ??= {});
      selectionAmounts[selectionKey] = (selectionAmounts[selectionKey] ?? 0) + bet.amount;
    }
  }

  return { poolByBetType, winningSelectionAmounts };
}

/** netkeiba の払戻表から券種別の払戻組合せを取り出す。組合せが空の券種は取り込まない */
function pickNetkeibaPayouts(netkeibaPayouts: Partial<Record<string, NetkeibaPayoutEntry[]>>) {
  const byType: PayoutCalculationsByType = {};

  for (const [type, entries] of Object.entries(netkeibaPayouts)) {
    if (entries && entries.length > 0) {
      byType[type] = entries;
    }
  }

  return byType;
}

/** プールと的中投票額から券種別の払戻を計算する。保証オッズがあればそれを倍率の下限にする */
function calculatePayoutsFromPools(pools: BetPools, guaranteedOdds: Record<string, number>) {
  const byType: PayoutCalculationsByType = {};

  for (const [type, selectionAmounts] of Object.entries(pools.winningSelectionAmounts)) {
    // 的中が記録された券種は必ず同じ集計で総プールも積まれている
    const poolAmount = pools.poolByBetType[type] ?? 0;
    const totalWinningAmount = Object.values(selectionAmounts).reduce((sum, amount) => sum + amount, 0);
    const winningCount = Object.keys(selectionAmounts).length;

    const calculations = (byType[type] ??= []);

    for (const [selectionKey, selectionAmount] of Object.entries(selectionAmounts)) {
      const rate = calculatePayoutRate(poolAmount, selectionAmount, totalWinningAmount, winningCount);
      const guaranteedRate = guaranteedOdds[type];

      // 保証で倍率が引き上げられた組み合わせはフラグを残し、UI で保証適用を示せるようにする
      const isGuaranteed = guaranteedRate !== undefined && rate < guaranteedRate;
      const appliedRate = isGuaranteed ? guaranteedRate : rate;

      calculations.push({
        numbers: parseSelectionKey(selectionKey),
        payout: Math.floor(ODDS_UNIT * appliedRate),
        ...(isGuaranteed && { guaranteed: true }),
      });
    }
  }

  return byType;
}

/**
 * 保証オッズのある券種について、誰も買っていない的中組合せを保証倍率で byType へ補完する。
 * 保証の無い券種は補完せず、購入も無ければ払戻表に載らない。券種ごとに組合せ順で並べ替える
 */
function fillGuaranteedCombinations(
  byType: PayoutCalculationsByType,
  finishers: Finisher[],
  guaranteedOdds: Record<string, number>
): void {
  const byCombination = (a: PayoutCombination, b: PayoutCombination) =>
    a.numbers.join('-').localeCompare(b.numbers.join('-'));

  for (const type of Object.values(BET_TYPES)) {
    const guaranteedRate = guaranteedOdds[type];
    if (guaranteedRate === undefined) {
      byType[type]?.sort(byCombination);
      continue;
    }

    const calculations = (byType[type] ??= []);
    for (const combination of getWinningCombinations(type, finishers)) {
      const key = normalizeSelections(type, combination);
      const exists = calculations.some((p) => normalizeSelections(type, p.numbers) === key);
      if (exists) continue;

      calculations.push({ numbers: combination, payout: Math.floor(ODDS_UNIT * guaranteedRate), guaranteed: true });
    }
    calculations.sort(byCombination);
  }
}

// 着順を確定して払戻を計算する。本番では throw のメッセージがマスクされるため、
// 未締切・確定済みなどの想定内エラーは throw せず { success: false, error } で返す。
export async function finalizeRace(
  raceId: string,
  results: RaceResultInput[],
  netkeibaPayouts?: Partial<Record<string, NetkeibaPayoutEntry[]>>
) {
  return runAction(() => finalizeRaceInner(raceId, results, netkeibaPayouts));
}

async function finalizeRaceInner(
  raceId: string,
  results: RaceResultInput[],
  netkeibaPayouts?: Partial<Record<string, NetkeibaPayoutEntry[]>>
) {
  const session = await requireAdmin();

  let rankingPayload: {
    finishPosition: number;
    horseNumber: number;
    bracketNumber: number;
    horseName: string;
  }[] = [];

  await db.transaction(async (tx) => {
    const lockKey = `payout:${raceId}`;
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

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

    // トランザクションが巻き戻ればログも消えるため、検証通過時点で記録してよい
    await logAdminAction(tx, session.user, { action: 'race.finalize_results', targetId: raceId });

    if (results.length > 0) {
      await tx
        .update(raceEntries)
        .set({ finishPosition: buildFinishPositionCase(results) })
        .where(eq(raceEntries.raceId, raceId));
    }

    const raceEntriesWithInfo = await tx.query.raceEntries.findMany({
      where: eq(raceEntries.raceId, raceId),
      with: { horse: true },
      orderBy: [raceEntries.finishPosition],
    });

    // 着順の付いた出走馬。着順があるのに馬番か枠番が欠けているのはデータ不整合であり、
    // 欠けたまま進めると的中判定と払戻が静かに狂うため、ここで払戻計算ごと止める
    const finishedEntries = raceEntriesWithInfo.flatMap((e) => {
      if (e.finishPosition === null) return [];
      if (e.horseNumber === null || e.bracketNumber === null) {
        throw new ActionError(`${e.horse.name} に着順が入っていますが、馬番または枠番が設定されていません`);
      }
      return [
        {
          finishPosition: e.finishPosition,
          horseNumber: e.horseNumber,
          bracketNumber: e.bracketNumber,
          horseName: e.horse.name,
        },
      ];
    });

    const finishers: Finisher[] = finishedEntries.map(({ horseNumber, bracketNumber }) => ({
      horseNumber,
      bracketNumber,
    }));

    if (finishers.length === 0) throw new ActionError('着順が指定されていません');

    const { invalidHorseIds, validBrackets } = resolveInvalidSelections(raceEntriesWithInfo);

    rankingPayload = finishedEntries.slice(0, 5);

    const allBets = await tx.query.bets.findMany({
      where: eq(bets.raceId, raceId),
    });

    // レースに無い券種はシステム既定値へフォールバックする
    const guaranteedOdds = resolveGuaranteedOdds(await getDefaultGuaranteedOdds(tx), raceInstance.guaranteedOdds);

    const pools = aggregateBetPools(allBets, finishers, invalidHorseIds, validBrackets);

    let payoutCalculationsByType: PayoutCalculationsByType;

    if (netkeibaPayouts) {
      payoutCalculationsByType = pickNetkeibaPayouts(netkeibaPayouts);
    } else {
      payoutCalculationsByType = calculatePayoutsFromPools(pools, guaranteedOdds);
      fillGuaranteedCombinations(payoutCalculationsByType, finishers, guaranteedOdds);
    }

    await tx.delete(payoutResultsTable).where(eq(payoutResultsTable.raceId, raceId));

    for (const type of Object.values(BET_TYPES)) {
      const combinations = payoutCalculationsByType[type];
      if (combinations && combinations.length > 0) {
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
