'use server';

import { BET_TYPE_ORDER, type BetType } from '@/entities/bet';
import { db } from '@/shared/db';
import { raceAllowedBetTypes } from '@/shared/db/schema';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { ADMIN_ERRORS, requireAdmin, revalidateRacePaths } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import { eq } from 'drizzle-orm';

const VALID_BET_TYPES = new Set<string>(BET_TYPE_ORDER);

/**
 * レース単位の購入可能な馬券種別を置き換える。
 * null は制限の解除でイベント設定へのフォールバックを意味し、配列は1種以上が必須。
 * 保存後に SSE で購入画面へ変更を通知する。
 */
export async function updateRaceAllowedBetTypes(raceId: string, allowedTypes: BetType[] | null) {
  const session = await requireAdmin();

  if (allowedTypes !== null && (allowedTypes.length === 0 || allowedTypes.some((t) => !VALID_BET_TYPES.has(t)))) {
    throw new Error(ADMIN_ERRORS.INVALID_INPUT);
  }

  // 表示順へ正規化しつつ重複を除去する
  const normalized = allowedTypes === null ? null : BET_TYPE_ORDER.filter((t) => allowedTypes.includes(t));

  await db.transaction(async (tx) => {
    await tx.delete(raceAllowedBetTypes).where(eq(raceAllowedBetTypes.raceId, raceId));
    if (normalized) {
      await tx.insert(raceAllowedBetTypes).values(normalized.map((betType) => ({ raceId, betType })));
    }
  });

  await logAdminAction(db, session, 'race.update_allowed_bet_types', raceId, { allowedTypes: normalized });
  raceEventEmitter.emit(RACE_EVENTS.BET_RESTRICTION_UPDATED, { raceId, timestamp: Date.now() });

  revalidateRacePaths(raceId);
}
