'use server';

import { db } from '@/shared/db';
import { payoutResults, raceEntries, raceInstances } from '@/shared/db/schema';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { ActionError, requireAdmin, runAction } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// 着順と払戻表を消して再入力できる状態へ戻す。確定済み・BET5 精算済みなどの
// 想定内エラーは throw せず { success: false, error } で返す
export async function resetRaceResults(raceId: string) {
  return runAction(() => resetRaceResultsInner(raceId));
}

async function resetRaceResultsInner(raceId: string) {
  const session = await requireAdmin();

  await db.transaction(async (tx) => {
    const lockKey = `payout:${raceId}`;
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

    const race = await tx.query.raceInstances.findFirst({
      where: eq(raceInstances.id, raceId),
      columns: { id: true, status: true },
    });

    if (!race) throw new ActionError('レースが見つかりませんでした');
    if (race.status === 'FINALIZED') {
      throw new ActionError('確定済みのレースはリセットできません');
    }

    // BET5精算はレースの着順を前提に行われるため、精算後に着順を消すと払戻の根拠が失われる
    const finalizedBet5 = await tx.query.bet5Events.findFirst({
      where: (bet5Events, { and, eq, or }) =>
        and(
          or(
            eq(bet5Events.race1Id, raceId),
            eq(bet5Events.race2Id, raceId),
            eq(bet5Events.race3Id, raceId),
            eq(bet5Events.race4Id, raceId),
            eq(bet5Events.race5Id, raceId)
          ),
          eq(bet5Events.status, 'FINALIZED')
        ),
      columns: { id: true },
    });
    if (finalizedBet5) {
      throw new ActionError('BET5精算済みのイベントに含まれるレースはリセットできません');
    }

    await logAdminAction(tx, session.user, { action: 'race.reset_results', targetId: raceId });

    await tx.update(raceEntries).set({ finishPosition: null }).where(eq(raceEntries.raceId, raceId));

    await tx.delete(payoutResults).where(eq(payoutResults.raceId, raceId));
  });

  raceEventEmitter.emit(RACE_EVENTS.RACE_RESULT_UPDATED, {
    raceId,
    results: [],
    timestamp: Date.now(),
  });

  revalidatePath(`/admin/races/${raceId}`);
  revalidatePath(`/races/${raceId}`);
}
