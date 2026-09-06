'use server';

import type { BetDetail } from '@/entities/bet';
import { isRefundedBet, normalizeSelections, ODDS_UNIT, resolveInvalidSelections } from '@/entities/bet';
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
import { ActionError, runAction } from '@/shared/utils/action-result';
import { ADMIN_ERRORS, requireAdmin, revalidateRacePaths } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

/** 精算後にベット行へ書き戻す 1 件分の内容 */
interface BetUpdate {
  id: string;
  walletId: string;
  status: 'HIT' | 'LOST' | 'REFUNDED';
  payout: number;
  odds: string;
}

/** 払戻表に載る 1 組合せのうち、精算に使う部分 */
// 払戻組合せの形は payoutResults.combinations の $type が単一の管理点
type PayoutCombination = (typeof payoutResultsTable.$inferSelect)['combinations'][number];

/** 精算に使う最小限のベット情報 */
interface SettleableBet {
  id: string;
  walletId: string;
  amount: number;
  details: BetDetail;
}

/** 精算の集計結果。ベット更新内容と、ウォレット別の払戻・券種別の売上・券種別の的中有無 */
interface SettlementSummary {
  betUpdates: BetUpdate[];
  walletPayouts: Map<string, number>;
  salesByType: Map<string, number>;
  hasWinnerByType: Map<string, boolean>;
}

/**
 * 全ベットを返還・的中・不的中へ振り分け、ウォレット別の払戻合計と券種別の売上と的中有無を集計する。
 * 返還したベットは売上に数えない。betUpdates は渡されたベットの順序を保つ。
 */
function settleBets(
  allBets: SettleableBet[],
  resultsMap: Map<string, PayoutCombination[]>,
  invalidHorseIds: Set<number>,
  validBrackets: Set<number>
): SettlementSummary {
  const walletPayouts = new Map<string, number>();
  const salesByType = new Map<string, number>();
  const hasWinnerByType = new Map<string, boolean>();
  const betUpdates: BetUpdate[] = [];

  for (const bet of allBets) {
    const betDetail = bet.details;

    if (isRefundedBet(betDetail.type, betDetail.selections, invalidHorseIds, validBrackets)) {
      betUpdates.push({
        id: bet.id,
        walletId: bet.walletId,
        status: 'REFUNDED',
        payout: bet.amount,
        odds: '1.0',
      });

      const refundedTotal = walletPayouts.get(bet.walletId) ?? 0;
      walletPayouts.set(bet.walletId, refundedTotal + bet.amount);
      continue;
    }

    const typeSales = salesByType.get(betDetail.type) ?? 0;
    salesByType.set(betDetail.type, typeSales + bet.amount);

    const typeResults = resultsMap.get(betDetail.type) ?? [];
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

    betUpdates.push({ id: bet.id, walletId: bet.walletId, status, payout, odds });

    if (payout > 0) {
      const currentTotal = walletPayouts.get(bet.walletId) ?? 0;
      walletPayouts.set(bet.walletId, currentTotal + payout);
    }
  }

  return { betUpdates, walletPayouts, salesByType, hasWinnerByType };
}

/** 的中者がいない券種の売上をキャリーオーバーとして合計する。売上が 0 の券種は加算しない */
function sumCarryover(salesByType: Map<string, number>, hasWinnerByType: Map<string, boolean>): number {
  let carryover = 0;

  for (const [type, sales] of salesByType.entries()) {
    if (!hasWinnerByType.get(type) && sales > 0) {
      carryover += sales;
    }
  }

  return carryover;
}

// 払戻を確定してベットの精算とウォレットへの加算を行う。未締切・確定済み・払戻表なしなどの
// 想定内エラーは throw せず { success: false, error } で返す
export async function finalizePayout(raceId: string) {
  return runAction(() => finalizePayoutInner(raceId));
}

async function finalizePayoutInner(raceId: string) {
  const session = await requireAdmin();

  await db.transaction(async (tx) => {
    const lockKey = `payout:${raceId}`;
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

    // 再開や編集の UPDATE と直列化する行ロック。これがないと状態を読んだ後に再開がコミットされ、
    // 追加購入を受けたレースへ古い払戻表で FINALIZED を書き込みうる。
    // 購入側の FOR SHARE と同じ行を先に取るため、ウォレット行との取得順序も購入と揃う
    await tx.execute(sql`SELECT 1 FROM race_instance WHERE id = ${raceId} FOR UPDATE`);

    const race = await tx.query.raceInstances.findFirst({
      where: eq(raceInstances.id, raceId),
      columns: { id: true, status: true, eventId: true },
    });

    if (!race) {
      throw new ActionError(ADMIN_ERRORS.NOT_FOUND);
    }

    if (race.status === 'FINALIZED') {
      throw new ActionError('すでに払戻確定済みです');
    }

    if (race.status !== 'CLOSED') {
      throw new ActionError('レースが締切状態ではありません');
    }

    // トランザクションが巻き戻ればログも消えるため、検証通過時点で記録してよい
    await logAdminAction(tx, session.user, { action: 'race.finalize_payout', targetId: raceId });

    const results = await tx.select().from(payoutResultsTable).where(eq(payoutResultsTable.raceId, raceId));
    if (results.length === 0) {
      throw new ActionError('払戻計算結果が存在しません');
    }

    const resultsMap = new Map<string, PayoutCombination[]>();
    for (const r of results) {
      resultsMap.set(r.type, r.combinations);
    }

    const raceEntriesInRace = await tx.query.raceEntries.findMany({
      where: eq(raceEntries.raceId, raceId),
      columns: { horseNumber: true, bracketNumber: true, status: true },
    });

    const { invalidHorseIds, validBrackets } = resolveInvalidSelections(raceEntriesInRace);

    // 二重払戻防止: 万一FINALIZED以外へ状態が戻されても、処理済みベットは再処理しない
    const allBets = await tx.query.bets.findMany({
      where: and(eq(bets.raceId, raceId), eq(bets.status, 'PENDING')),
    });

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

    const { betUpdates, walletPayouts, salesByType, hasWinnerByType } = settleBets(
      allBets,
      resultsMap,
      invalidHorseIds,
      validBrackets
    );

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

      // 複数レースの同時確定が同じウォレット集合を別順で更新するとデッドロックしうるため、
      // 一括更新の前に id 昇順で行ロックを取り、取得順序を全経路で揃える
      await tx
        .select({ id: wallets.id })
        .from(wallets)
        .where(inArray(wallets.id, walletIds))
        .orderBy(asc(wallets.id))
        .for('update');
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
        walletId: d.walletId,
        type: d.status === 'REFUNDED' ? ('REFUND' as const) : ('PAYOUT' as const),
        amount: d.payout,
        referenceId: d.id,
      }));

    if (transactionValues.length > 0) {
      const TX_BATCH_SIZE = 1000;
      for (let i = 0; i < transactionValues.length; i += TX_BATCH_SIZE) {
        await tx.insert(transactions).values(transactionValues.slice(i, i + TX_BATCH_SIZE));
      }
    }

    const raceCarryover = sumCarryover(salesByType, hasWinnerByType);

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
