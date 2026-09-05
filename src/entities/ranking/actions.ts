'use server';

import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { events } from '@/shared/db/schema';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { RankingDisplayMode } from './types';

/**
 * イベントのランキング公開範囲を切り替える。
 * 変更は SSE で閲覧中の画面へ通知し、ランキングページのキャッシュも破棄する。
 * キャッシュ破棄は閲覧者全員に効かせる必要があるため、呼び出し元ではなくここで行う。
 * 管理者以外の呼び出しは throw する。
 */
export async function updateRankingDisplayMode(eventId: string, mode: RankingDisplayMode) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  await db.update(events).set({ rankingDisplayMode: mode }).where(eq(events.id, eventId));

  raceEventEmitter.emit(RACE_EVENTS.RANKING_UPDATED, {
    eventId,
    mode,
  });

  revalidatePath('/ranking/[eventId]', 'page');
}
