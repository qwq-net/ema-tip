'use server';

import { db } from '@/shared/db';
import { events } from '@/shared/db/schema';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { ActionError, ADMIN_ERRORS, requireAdmin, runAction } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { RankingDisplayMode } from './types';

/**
 * イベントのランキング公開範囲を切り替える。
 * 変更は SSE で閲覧中の画面へ通知し、ランキングページのキャッシュも破棄する。
 * キャッシュ破棄は閲覧者全員に効かせる必要があるため、呼び出し元ではなくここで行う。
 * 管理者以外の呼び出しとイベント不在は throw せず { success: false, error } で返し、不在時は通知もしない。
 */
export async function updateRankingDisplayMode(eventId: string, mode: RankingDisplayMode) {
  return runAction(async () => {
    const session = await requireAdmin();

    const updated = await db
      .update(events)
      .set({ rankingDisplayMode: mode })
      .where(eq(events.id, eventId))
      .returning({ id: events.id });
    if (updated.length === 0) throw new ActionError(ADMIN_ERRORS.NOT_FOUND);

    await logAdminAction(db, session.user, {
      action: 'event.update_ranking_display_mode',
      targetId: eventId,
      detail: { mode },
    });

    raceEventEmitter.emit(RACE_EVENTS.RANKING_UPDATED, {
      eventId,
      mode,
    });

    revalidatePath('/ranking/[eventId]', 'page');
  });
}
