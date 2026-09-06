'use server';

import { db } from '@/shared/db';
import { bets, raceInstances } from '@/shared/db/schema';
import { requireAdmin } from '@/shared/utils/admin';
import { count, eq, sql, sum } from 'drizzle-orm';

export interface RaceBetSummary {
  betCount: number;
  totalAmount: number;
  totalPayout: number;
}

/**
 * イベント配下のレースごとに馬券の件数・投票額・払戻額を集計して raceId をキーに返す。
 * 馬券のないレースはキーを持たないため、呼び手はゼロ埋めして扱う。
 */
export async function getRaceBetSummaries(eventId: string): Promise<Map<string, RaceBetSummary>> {
  await requireAdmin();

  const rows = await db
    .select({
      raceId: bets.raceId,
      betCount: count(),
      totalAmount: sum(bets.amount),
      totalPayout: sql<string>`coalesce(sum(${bets.payout}), 0)`,
    })
    .from(bets)
    .innerJoin(raceInstances, eq(bets.raceId, raceInstances.id))
    .where(eq(raceInstances.eventId, eventId))
    .groupBy(bets.raceId);

  return new Map(
    rows.map((row) => [
      row.raceId,
      { betCount: row.betCount, totalAmount: Number(row.totalAmount ?? 0), totalPayout: Number(row.totalPayout) },
    ])
  );
}

export async function getBetsByRace(raceId: string) {
  await requireAdmin();

  return db.query.bets.findMany({
    where: eq(bets.raceId, raceId),
    orderBy: (bets, { desc }) => [desc(bets.createdAt)],
    with: {
      // パスワードハッシュ等を含むためカラムを明示的に絞る
      user: {
        columns: { id: true, name: true },
      },
    },
  });
}
