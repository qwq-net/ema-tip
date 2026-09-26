'use server';

import { db } from '@/shared/db';
import { bet5Events, bet5Tickets, betGroups, events, raceInstances } from '@/shared/db/schema';
import { ActionError, requireAdmin, runAction } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import { desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * 通常馬券と BET5 の購入がないイベントだけを削除する。配布済みのウォレットもイベントとともに消える。
 * 繰越金が残る場合は、削除後に残る最新イベントへ移す。
 */
export async function deleteEvent(eventId: string) {
  return runAction(async () => {
    const session = await requireAdmin();
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT 1 FROM event WHERE id = ${eventId} FOR UPDATE`);
      const event = await tx.query.events.findFirst({
        where: eq(events.id, eventId),
        columns: { id: true, name: true, carryoverAmount: true },
      });
      if (!event) throw new ActionError('イベントが見つかりません');

      await tx.execute(sql`SELECT 1 FROM race_instance WHERE event_id = ${eventId} ORDER BY id FOR UPDATE`);
      await tx.execute(sql`SELECT 1 FROM bet5_event WHERE event_id = ${eventId} FOR UPDATE`);
      const races = await tx.query.raceInstances.findMany({
        where: eq(raceInstances.eventId, eventId),
        columns: { id: true },
      });
      const bet5 = await tx.query.bet5Events.findFirst({
        where: eq(bet5Events.eventId, eventId),
        columns: { id: true },
      });

      if (races.length > 0) {
        const purchase = await tx.query.betGroups.findFirst({
          where: inArray(
            betGroups.raceId,
            races.map((race) => race.id)
          ),
          columns: { id: true },
        });
        if (purchase) throw new ActionError('馬券の購入があるイベントは削除できません');
      }
      if (bet5) {
        const ticket = await tx.query.bet5Tickets.findFirst({
          where: eq(bet5Tickets.bet5EventId, bet5.id),
          columns: { id: true },
        });
        if (ticket) throw new ActionError('BET5の購入があるイベントは削除できません');
      }

      if (event.carryoverAmount > 0) {
        const remainingLatest = await tx.query.events.findFirst({
          where: ne(events.id, eventId),
          columns: { id: true },
          orderBy: [desc(events.date), desc(events.createdAt)],
        });
        if (remainingLatest) {
          await tx
            .update(events)
            .set({ carryoverAmount: sql`${events.carryoverAmount} + ${event.carryoverAmount}` })
            .where(eq(events.id, remainingLatest.id));
        }
      }

      if (bet5) await tx.delete(bet5Events).where(eq(bet5Events.id, bet5.id));
      await tx.delete(events).where(eq(events.id, eventId));
      await logAdminAction(tx, session.user, {
        action: 'event.delete',
        targetId: eventId,
        detail: { name: event.name, raceCount: races.length, carryoverAmount: event.carryoverAmount },
      });
    });
    revalidatePath('/admin/events');
    revalidatePath('/mypage/sokubet');
    revalidatePath('/mypage/claim');
  });
}
