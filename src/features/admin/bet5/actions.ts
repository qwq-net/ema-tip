'use server';

import {
  calculateBet5Payout,
  closeBet5Event,
  createBet5Event,
  updateBet5InitialPot,
} from '@/entities/bet/lib/bet5-event';
import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { logAdminAction } from '@/shared/utils/admin-audit';
import { revalidatePath } from 'next/cache';

/**
 * BET5 イベントを作成して返す。raceIds は開催順に並んだ 5 レース分を渡す。
 * 管理者以外の呼び出しは throw する。
 */
export async function createBet5EventAction({
  eventId,
  raceIds,
  initialPot,
}: {
  eventId: string;
  raceIds: [string, string, string, string, string];
  initialPot: number;
}) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const bet5Event = await createBet5Event({ eventId, raceIds, initialPot });
  revalidatePath(`/admin/events/${eventId}`);
  return bet5Event;
}

/**
 * BET5 の投票受付を締め切り、更新後のイベントを返す。監査ログへ記録する。
 * 管理者以外の呼び出しは throw する。
 */
export async function closeBet5EventAction(bet5EventId: string, eventId: string) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const updated = await closeBet5Event(bet5EventId);
  await logAdminAction(db, session.user, { action: 'bet5.close', targetId: bet5EventId });
  revalidatePath(`/admin/events/${eventId}`);
  return updated;
}

/**
 * BET5 のキャリーオーバー元本を書き換え、更新後のイベントを返す。監査ログへ記録する。
 * 管理者以外の呼び出しは throw する。
 */
export async function updateBet5InitialPotAction(bet5EventId: string, eventId: string, initialPot: number) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const updated = await updateBet5InitialPot(bet5EventId, initialPot);
  await logAdminAction(db, session.user, {
    action: 'bet5.update_initial_pot',
    targetId: bet5EventId,
    detail: { initialPot },
  });
  revalidatePath(`/admin/events/${eventId}`);
  return updated;
}

/**
 * BET5 の払戻を確定する。締切済みでない等の理由で成立しない場合は success: false を返し、
 * 状態を変えないため監査ログにも残さない。管理者以外の呼び出しは throw する。
 */
export async function calculateBet5PayoutAction(bet5EventId: string, eventId: string) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const result = await calculateBet5Payout(bet5EventId);
  if (result.success) {
    await logAdminAction(db, session.user, {
      action: 'bet5.finalize_payout',
      targetId: bet5EventId,
      detail: { winCount: result.winCount ?? 0, dividend: result.dividend ?? 0 },
    });
  }
  revalidatePath(`/admin/events/${eventId}`);
  return result;
}
