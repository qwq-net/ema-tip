'use server';

import { BetDetail } from '@/entities/bet';
import { isRefundedBet, normalizeSelections, ODDS_UNIT } from '@/entities/bet/lib/payout';
import { db } from '@/shared/db';
import {
  bets,
  events,
  payoutResults as payoutResultsTable,
  raceEntries,
  raceInstances,
  transactions,
  wallets,
} from '@/shared/db/schema';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { ADMIN_ERRORS, requireAdmin, revalidateRacePaths } from '@/shared/utils/admin';
import { and, eq, inArray, sql } from 'drizzle-orm';

export async function finalizePayout(raceId: string) {
  await requireAdmin();

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`payout:${raceId}`}))`);

    const race = await tx.query.raceInstances.findFirst({
      where: eq(raceInstances.id, raceId),
      columns: { id: true, status: true, eventId: true },
    });

    if (!race) {
      throw new Error(ADMIN_ERRORS.NOT_FOUND);
    }

    if (race.status === 'FINALIZED') {
      throw new Error('すでに払戻確定済みです');
    }

    if (race.status !== 'CLOSED') {
      throw new Error('レースが締切状態ではありません');
    }

    const results = await tx.select().from(payoutResultsTable).where(eq(payoutResultsTable.raceId, raceId));
    if (results.length === 0) {
      throw new Error('払戻計算結果が存在しません');
    }

    const resultsMap = new Map<string, Array<{ numbers: number[]; payout: number }>>();
    for (const r of results) {
      resultsMap.set(r.type, r.combinations as Array<{ numbers: number[]; payout: number }>);
    }

    const raceEntriesInRace = await tx.query.raceEntries.findMany({
      where: eq(raceEntries.raceId, raceId),
      columns: { horseNumber: true, bracketNumber: true, status: true },
    });

    const invalidHorseIds = new Set(
      raceEntriesInRace.filter((e) => e.status === 'SCRATCHED' || e.status === 'EXCLUDED').map((e) => e.horseNumber!)
    );

    const validBrackets = new Set(
      raceEntriesInRace
        .filter((e) => e.status === 'ENTRANT')
        .map((e) => e.bracketNumber!)
        .filter((b): b is number => b !== null)
    );

    // 二重払戻防止: 万一FINALIZED以外へ状態が戻されても、処理済みベットは再処理しない
    const allBets = await tx.query.bets.findMany({
      where: and(eq(bets.raceId, raceId), eq(bets.status, 'PENDING')),
    });

    const betById = new Map(allBets.map((bet) => [bet.id, bet]));

    if (allBets.length === 0) {
      await tx
        .update(raceInstances)
        .set({
          status: 'FINALIZED',
          finalizedAt: new Date(),
        })
        .where(eq(raceInstances.id, raceId));
      return;
    }

    const walletPayouts = new Map<string, number>();
    const salesByType = new Map<string, number>();
    const hasWinnerByType = new Map<string, boolean>();
    const betUpdates: {
      id: string;
      status: 'HIT' | 'LOST' | 'REFUNDED';
      payout: number;
      odds: string;
    }[] = [];

    for (const bet of allBets) {
      const betDetail = bet.details as BetDetail;

      if (isRefundedBet(betDetail.type, betDetail.selections, invalidHorseIds, validBrackets)) {
        betUpdates.push({
          id: bet.id,
          status: 'REFUNDED',
          payout: bet.amount,
          odds: '1.0',
        });

        const refundedTotal = walletPayouts.get(bet.walletId) || 0;
        walletPayouts.set(bet.walletId, refundedTotal + bet.amount);
        continue;
      }

      const typeSales = salesByType.get(betDetail.type) || 0;
      salesByType.set(betDetail.type, typeSales + bet.amount);

      const typeResults = resultsMap.get(betDetail.type) || [];
      const betKey = normalizeSelections(betDetail.type, betDetail.selections);

      const hitResult = typeResults.find((r) => normalizeSelections(betDetail.type, r.numbers) === betKey);

      let status: 'HIT' | 'LOST' = 'LOST';
      let payout = 0;
      let odds = '0.0';

      if (hitResult) {
        status = 'HIT';
        payout = Math.floor((bet.amount * hitResult.payout) / ODDS_UNIT);
        odds = (hitResult.payout / ODDS_UNIT).toFixed(1);
        hasWinnerByType.set(betDetail.type, true);
      }

      betUpdates.push({ id: bet.id, status, payout, odds });

      if (payout > 0) {
        const currentTotal = walletPayouts.get(bet.walletId) || 0;
        walletPayouts.set(bet.walletId, currentTotal + payout);
      }
    }

    if (betUpdates.length > 0) {
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < betUpdates.length; i += CHUNK_SIZE) {
        const chunk = betUpdates.slice(i, i + CHUNK_SIZE);
        const chunkIds = chunk.map((b) => b.id);

        const chunkStatusCase = sql<'HIT' | 'LOST' | 'REFUNDED'>`CASE ${sql.join(
          chunk.map((b) => sql`WHEN ${bets.id} = ${b.id} THEN ${b.status}`),
          sql` `
        )} ELSE ${bets.status} END::bet_status`;
        const chunkPayoutCase = sql<number>`CASE ${sql.join(
          chunk.map((b) => sql`WHEN ${bets.id} = ${b.id} THEN ${b.payout}`),
          sql` `
        )} ELSE ${bets.payout} END::bigint`;
        const chunkOddsCase = sql<string>`CASE ${sql.join(
          chunk.map((b) => sql`WHEN ${bets.id} = ${b.id} THEN ${b.odds}`),
          sql` `
        )} ELSE ${bets.odds} END::numeric`;

        await tx
          .update(bets)
          .set({
            status: chunkStatusCase,
            payout: chunkPayoutCase,
            odds: chunkOddsCase,
          })
          .where(inArray(bets.id, chunkIds));
      }
    }

    const walletEntries = [...walletPayouts.entries()].filter(([, amount]) => amount > 0);
    if (walletEntries.length > 0) {
      const walletIds = walletEntries.map(([id]) => id);
      const payoutCase = sql<number>`CASE ${sql.join(
        walletEntries.map(([id, amount]) => sql`WHEN ${wallets.id} = ${id} THEN ${amount}`),
        sql` `
      )} ELSE 0 END::bigint`;

      await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} + ${payoutCase}` })
        .where(inArray(wallets.id, walletIds));
    }

    const transactionValues = betUpdates
      .filter((d) => d.payout > 0)
      .map((d) => ({
        walletId: betById.get(d.id)!.walletId,
        type: (d.status === 'REFUNDED' ? 'REFUND' : 'PAYOUT') as 'REFUND' | 'PAYOUT',
        amount: d.payout,
        referenceId: d.id,
      }));

    if (transactionValues.length > 0) {
      const TX_BATCH_SIZE = 1000;
      for (let i = 0; i < transactionValues.length; i += TX_BATCH_SIZE) {
        await tx.insert(transactions).values(transactionValues.slice(i, i + TX_BATCH_SIZE));
      }
    }

    let raceCarryover = 0;
    for (const [type, sales] of salesByType.entries()) {
      if (!hasWinnerByType.get(type) && sales > 0) {
        raceCarryover += sales;
      }
    }

    if (raceCarryover > 0) {
      await tx
        .update(events)
        .set({ carryoverAmount: sql`${events.carryoverAmount} + ${raceCarryover}` })
        .where(eq(events.id, race.eventId));
    }

    await tx
      .update(raceInstances)
      .set({
        status: 'FINALIZED',
        finalizedAt: new Date(),
      })
      .where(eq(raceInstances.id, raceId));
  });

  raceEventEmitter.emit(RACE_EVENTS.RACE_BROADCAST, { raceId, timestamp: Date.now() });

  revalidateRacePaths(raceId);

  return { success: true };
}
