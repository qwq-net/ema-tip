'use server';

import { db } from '@/shared/db';
import { bet5Events, bet5Tickets } from '@/shared/db/schema';
import { ActionError, requireAdmin, runAction } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/** 購入と払戻がない BET5 の設定だけを取り消す。受付中・締切後のどちらでも再設定できる。 */
export async function cancelBet5EventAction(bet5EventId: string, eventId: string) {
  return runAction(async () => {
    const session = await requireAdmin();
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT 1 FROM bet5_event WHERE id = ${bet5EventId} FOR UPDATE`);
      const bet5 = await tx.query.bet5Events.findFirst({
        where: eq(bet5Events.id, bet5EventId),
        columns: { id: true, eventId: true, status: true },
      });
      if (bet5?.eventId !== eventId) throw new ActionError('BET5が見つかりません');
      if (bet5.status === 'FINALIZED') throw new ActionError('払戻確定済みのBET5は取り消せません');
      const ticket = await tx.query.bet5Tickets.findFirst({
        where: eq(bet5Tickets.bet5EventId, bet5EventId),
        columns: { id: true },
      });
      if (ticket) throw new ActionError('BET5の購入があるため取り消せません');

      await tx.delete(bet5Events).where(eq(bet5Events.id, bet5EventId));
      await logAdminAction(tx, session.user, {
        action: 'bet5.cancel',
        targetId: bet5EventId,
        detail: { eventId },
      });
    });
    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath(`/admin/events/${eventId}/bet5`);
    revalidatePath('/mypage/sokubet');
    revalidatePath(`/events/${eventId}/bet5`);
  });
}
