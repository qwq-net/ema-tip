'use server';

import { db } from '@/shared/db';
import { bet5Events, betGroups, raceInstances } from '@/shared/db/schema';
import { ActionError, requireAdmin, runAction } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import { eq, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * 購入済み馬券や BET5 の対象になっていないレースだけを削除する。
 * 購入・BET5 設定との競合を行ロックで直列化し、削除と監査ログを同一取引で確定する。
 */
export async function deleteRace(raceId: string) {
  return runAction(async () => {
    const session = await requireAdmin();
    const eventId = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT 1 FROM race_instance WHERE id = ${raceId} FOR UPDATE`);
      const race = await tx.query.raceInstances.findFirst({
        where: eq(raceInstances.id, raceId),
        columns: { id: true, eventId: true, name: true },
      });
      if (!race) throw new ActionError('レースが見つかりません');

      const purchase = await tx.query.betGroups.findFirst({
        where: eq(betGroups.raceId, raceId),
        columns: { id: true },
      });
      if (purchase) throw new ActionError('馬券の購入があるレースは削除できません');

      const bet5 = await tx.query.bet5Events.findFirst({
        where: or(
          eq(bet5Events.race1Id, raceId),
          eq(bet5Events.race2Id, raceId),
          eq(bet5Events.race3Id, raceId),
          eq(bet5Events.race4Id, raceId),
          eq(bet5Events.race5Id, raceId)
        ),
        columns: { id: true },
      });
      if (bet5) throw new ActionError('BET5の対象レースです。先にBET5の設定を取り消してください');

      await tx.delete(raceInstances).where(eq(raceInstances.id, raceId));
      await logAdminAction(tx, session.user, {
        action: 'race.delete',
        targetId: raceId,
        detail: { name: race.name, eventId: race.eventId },
      });
      return race.eventId;
    });
    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath('/admin/events');
    revalidatePath('/mypage/sokubet');
  });
}
