'use server';

import {
  calculateBet5Payout,
  closeBet5Event,
  createBet5Event,
  updateBet5InitialPot,
} from '@/entities/bet/lib/bet5-event';
import { db } from '@/shared/db';
import { ActionError, runAction } from '@/shared/utils/action-result';
import { requireAdmin } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import { revalidatePath } from 'next/cache';

/**
 * BET5 イベントを作成して返す。raceIds は開催順に並んだ 5 レース分を渡す。
 * 締切済みレースの混入などの業務エラーは ActionResult の error で返す。
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
  return runAction(async () => {
    await requireAdmin();
    const bet5Event = await createBet5Event({ eventId, raceIds, initialPot });
    revalidatePath(`/admin/events/${eventId}`);
    return bet5Event;
  });
}

/** BET5 の投票受付を締め切り、更新後のイベントを返す。監査ログへ記録する。 */
export async function closeBet5EventAction(bet5EventId: string, eventId: string) {
  return runAction(async () => {
    const session = await requireAdmin();
    const updated = await closeBet5Event(bet5EventId);
    await logAdminAction(db, session.user, { action: 'bet5.close', targetId: bet5EventId });
    revalidatePath(`/admin/events/${eventId}`);
    return updated;
  });
}

/** BET5 のキャリーオーバー元本を書き換え、更新後のイベントを返す。監査ログへ記録する。 */
export async function updateBet5InitialPotAction(bet5EventId: string, eventId: string, initialPot: number) {
  return runAction(async () => {
    const session = await requireAdmin();
    const updated = await updateBet5InitialPot(bet5EventId, initialPot);
    await logAdminAction(db, session.user, {
      action: 'bet5.update_initial_pot',
      targetId: bet5EventId,
      detail: { initialPot },
    });
    revalidatePath(`/admin/events/${eventId}`);
    return updated;
  });
}

/**
 * BET5 の払戻を確定し、的中件数と 100 円あたり配当を返す。
 * 締切済みでない等の理由で成立しない場合は error で理由を返し、状態を変えないため監査ログにも残さない。
 */
export async function calculateBet5PayoutAction(bet5EventId: string, eventId: string) {
  return runAction(async () => {
    const session = await requireAdmin();
    const result = await calculateBet5Payout(bet5EventId);
    if (!result.success) {
      throw new ActionError(result.message);
    }
    const summary = { winCount: result.winCount ?? 0, dividend: result.dividend ?? 0 };
    await logAdminAction(db, session.user, {
      action: 'bet5.finalize_payout',
      targetId: bet5EventId,
      detail: summary,
    });
    revalidatePath(`/admin/events/${eventId}`);
    return summary;
  });
}
