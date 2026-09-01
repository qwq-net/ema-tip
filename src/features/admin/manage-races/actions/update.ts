'use server';

import { db } from '@/shared/db';
import { raceInstances } from '@/shared/db/schema';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { ADMIN_ERRORS, requireAdmin, revalidateRacePaths } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import { parseJSTToUTC } from '@/shared/utils/date';
import { and, eq, inArray } from 'drizzle-orm';
import { raceSchema } from '../model/validation';

export async function updateRace(id: string, formData: FormData) {
  await requireAdmin();

  const conditionValue = formData.get('condition');
  const closingAtValue = formData.get('closingAt');

  const parse = raceSchema.safeParse({
    eventId: formData.get('eventId'),
    date: formData.get('date'),
    venueId: formData.get('venueId'),
    raceDefinitionId: formData.get('raceDefinitionId') || undefined,
    direction: formData.get('direction') || undefined,
    name: formData.get('name'),
    raceNumber: formData.get('raceNumber') || undefined,
    distance: formData.get('distance'),
    surface: formData.get('surface'),
    condition: conditionValue && conditionValue !== '' ? conditionValue : undefined,
    closingAt: closingAtValue && closingAtValue !== '' ? closingAtValue : undefined,
  });

  if (!parse.success) {
    console.error('Validation Error Details:', parse.error.format());
    throw new Error(ADMIN_ERRORS.INVALID_INPUT);
  }

  const now = new Date();
  // レース編集フォームは closingAt を持たない。未送信のとき null を書くとタイマー設定が消えるため、
  // フィールドが送信された場合のみ closingAt を更新する
  const closingAtProvided = closingAtValue !== null;
  const newClosingAt = parse.data.closingAt ? parseJSTToUTC(parse.data.closingAt) : null;

  await db.transaction(async (tx) => {
    const race = await tx.query.raceInstances.findFirst({
      where: eq(raceInstances.id, id),
    });

    if (!race) throw new Error(ADMIN_ERRORS.NOT_FOUND);
    if (race.status === 'FINALIZED') throw new Error('払戻確定済みのレースは編集できません');

    let newStatus = race.status;
    if (closingAtProvided && race.status === 'CLOSED' && newClosingAt && newClosingAt > now) {
      newStatus = 'SCHEDULED';
    }

    await tx
      .update(raceInstances)
      .set({
        eventId: parse.data.eventId,
        date: parse.data.date,
        venueId: parse.data.venueId,

        raceDefinitionId: parse.data.raceDefinitionId || null,
        direction: parse.data.direction,
        name: parse.data.name,
        raceNumber: parse.data.raceNumber,
        distance: parse.data.distance,
        surface: parse.data.surface,
        condition: parse.data.condition || null,
        closingAt: closingAtProvided ? newClosingAt : undefined,
        status: newStatus,
      })
      .where(eq(raceInstances.id, id));
  });

  revalidateRacePaths(id);
}

export async function closeRace(raceId: string) {
  const session = await requireAdmin();

  const updated = await db
    .update(raceInstances)
    .set({ status: 'CLOSED' })
    .where(and(eq(raceInstances.id, raceId), eq(raceInstances.status, 'SCHEDULED')))
    .returning({ id: raceInstances.id });

  if (updated.length === 0) {
    const race = await db.query.raceInstances.findFirst({ where: eq(raceInstances.id, raceId) });
    // タイマー自動締切と手動締切が競合しうるため、既にCLOSEDなら冪等に成功扱いとする
    if (race?.status === 'CLOSED') return { success: true };
    throw new Error('受付中のレースのみ締め切れます');
  }

  await logAdminAction(db, session, 'race.close', raceId);
  raceEventEmitter.emit(RACE_EVENTS.RACE_CLOSED, { raceId, timestamp: Date.now() });

  revalidateRacePaths(raceId);
  return { success: true };
}

export async function reopenRace(raceId: string) {
  const session = await requireAdmin();

  const updated = await db
    .update(raceInstances)
    .set({ status: 'SCHEDULED', closingAt: null })
    .where(and(eq(raceInstances.id, raceId), eq(raceInstances.status, 'CLOSED')))
    .returning({ id: raceInstances.id });

  if (updated.length === 0) {
    throw new Error('締切済みのレースのみ再開できます');
  }

  await logAdminAction(db, session, 'race.reopen', raceId);
  raceEventEmitter.emit(RACE_EVENTS.RACE_REOPENED, { raceId, closingAt: null, timestamp: Date.now() });

  revalidateRacePaths(raceId);
  return { success: true };
}

export async function setClosingTime(raceId: string, minutes: number) {
  const session = await requireAdmin();

  const closingAt = new Date(Date.now() + minutes * 60 * 1000);

  // 締切済みからの再開とタイマー設定のみで通知を分けるため、遷移前のステータスを読む。
  // 更新との間に他の管理操作が挟まっても通知種別がずれるだけで、状態は下の条件付き更新が守る
  const race = await db.query.raceInstances.findFirst({
    where: eq(raceInstances.id, raceId),
  });

  const updated = await db
    .update(raceInstances)
    .set({ closingAt, status: 'SCHEDULED' })
    .where(and(eq(raceInstances.id, raceId), inArray(raceInstances.status, ['SCHEDULED', 'CLOSED'])))
    .returning({ id: raceInstances.id });

  if (updated.length === 0) {
    throw new Error('払戻確定済みのレースには締切時刻を設定できません');
  }

  await logAdminAction(db, session, 'race.set_closing_time', raceId, { minutes });
  const eventType = race?.status === 'CLOSED' ? RACE_EVENTS.RACE_REOPENED : RACE_EVENTS.RACE_TIMER_SET;
  raceEventEmitter.emit(eventType, { raceId, closingAt: closingAt.toISOString(), timestamp: Date.now() });

  revalidateRacePaths(raceId);

  return { success: true, closingAt };
}
