'use server';

import { BET_TYPES, type BetType } from '@/entities/bet';
import { db } from '@/shared/db';
import { payoutResults as payoutResultsTable } from '@/shared/db/schema';
import { requireUser } from '@/shared/utils/admin';
import { eq } from 'drizzle-orm';

const BET_TYPE_SET = new Set<string>(Object.values(BET_TYPES));

/**
 * レースの払戻結果を返す。combinations が jsonb のためここで型を確定させる境界。
 * シードのダミーなど、type が馬券種別として不正な行は除外する。
 */
export async function getPayoutResults(raceId: string) {
  await requireUser();

  const rows = await db.select().from(payoutResultsTable).where(eq(payoutResultsTable.raceId, raceId));
  return rows
    .filter((row) => BET_TYPE_SET.has(row.type))
    .map((row) => ({
      ...row,
      // SAFETY: 直前の filter で BET_TYPES に含まれる値のみ通している
      type: row.type as BetType,
      combinations: row.combinations,
    }));
}
