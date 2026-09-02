'use server';

import { BET_TYPE_ORDER, toAllowedBetTypes } from '@/entities/bet';
import { db } from '@/shared/db';
import { eventDefaultAllowedBetTypes, events } from '@/shared/db/schema';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { requireAdmin } from '@/shared/utils/admin';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { z } from 'zod';

const eventSchema = z.object({
  name: z.string().min(1, 'イベント名は必須です'),
  description: z.string().optional(),
  distributeAmount: z.coerce.number().min(0, '金額は0以上である必要があります'),
  loanAmount: z.coerce.number().min(0).optional().nullable(),
  loanEnabled: z.string().transform((value) => value === 'true'),
  loanThresholdPercent: z.coerce.number().int().min(0, '0〜100で入力してください').max(100, '0〜100で入力してください'),
  date: z.string(),
  // "null" または種別配列の JSON。パース不能な値は undefined に落として zod に拒否させる
  allowedBetTypes: z.preprocess(
    (value) => {
      try {
        return JSON.parse(String(value));
      } catch {
        return undefined;
      }
    },
    z.array(z.enum(BET_TYPE_ORDER)).min(1).nullable()
  ),
});

export async function createEvent(formData: FormData) {
  await requireAdmin();

  const parse = eventSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description')?.toString() || undefined,
    distributeAmount: formData.get('distributeAmount'),
    loanAmount: formData.get('loanAmount') || undefined,
    loanEnabled: formData.get('loanEnabled'),
    loanThresholdPercent: formData.get('loanThresholdPercent'),
    date: formData.get('date'),
    allowedBetTypes: formData.get('allowedBetTypes'),
  });

  if (!parse.success) {
    throw new Error('無効な入力です: ' + JSON.stringify(parse.error.flatten()));
  }

  // キャリーオーバーは前イベントからの「移動」。コピー元を残すと複数イベント作成時に二重計上される
  await db.transaction(async (tx) => {
    const lastEvent = await tx.query.events.findFirst({
      orderBy: (events, { desc }) => [desc(events.date), desc(events.createdAt)],
    });

    const carryover = lastEvent ? Number(lastEvent.carryoverAmount) : 0;

    const [created] = await tx
      .insert(events)
      .values({
        name: parse.data.name,
        description: parse.data.description,
        distributeAmount: parse.data.distributeAmount,
        date: parse.data.date,
        status: 'SCHEDULED',
        carryoverAmount: carryover,
        loanAmount: parse.data.loanAmount ?? null,
        loanEnabled: parse.data.loanEnabled,
        loanThresholdPercent: parse.data.loanThresholdPercent,
      })
      .returning({ id: events.id });

    if (parse.data.allowedBetTypes) {
      await tx
        .insert(eventDefaultAllowedBetTypes)
        .values(parse.data.allowedBetTypes.map((betType) => ({ eventId: created.id, betType })));
    }

    if (lastEvent && carryover > 0) {
      await tx.update(events).set({ carryoverAmount: 0 }).where(eq(events.id, lastEvent.id));
    }
  });

  revalidatePath('/admin/events');
}

export async function updateEvent(id: string, formData: FormData) {
  await requireAdmin();

  const parse = eventSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description')?.toString() || undefined,
    distributeAmount: formData.get('distributeAmount'),
    loanAmount: formData.get('loanAmount') || undefined,
    loanEnabled: formData.get('loanEnabled'),
    loanThresholdPercent: formData.get('loanThresholdPercent'),
    date: formData.get('date'),
    allowedBetTypes: formData.get('allowedBetTypes'),
  });

  if (!parse.success) {
    throw new Error('無効な入力です: ' + JSON.stringify(parse.error.flatten()));
  }

  // 保存のたびに全レースページへ通知が飛ぶのを避けるため、種別が実際に変わったときだけ emit する
  const before = await db
    .select({ betType: eventDefaultAllowedBetTypes.betType })
    .from(eventDefaultAllowedBetTypes)
    .where(eq(eventDefaultAllowedBetTypes.eventId, id));

  await db.transaction(async (tx) => {
    await tx
      .update(events)
      .set({
        name: parse.data.name,
        description: parse.data.description ?? null,
        distributeAmount: parse.data.distributeAmount,
        loanAmount: parse.data.loanAmount ?? null,
        loanEnabled: parse.data.loanEnabled,
        loanThresholdPercent: parse.data.loanThresholdPercent,
        date: parse.data.date,
      })
      .where(eq(events.id, id));

    await tx.delete(eventDefaultAllowedBetTypes).where(eq(eventDefaultAllowedBetTypes.eventId, id));
    if (parse.data.allowedBetTypes) {
      await tx
        .insert(eventDefaultAllowedBetTypes)
        .values(parse.data.allowedBetTypes.map((betType) => ({ eventId: id, betType })));
    }
  });

  const beforeSet = new Set(before.map((r) => r.betType));
  const afterList = parse.data.allowedBetTypes ?? [];
  const isChanged = beforeSet.size !== afterList.length || afterList.some((t) => !beforeSet.has(t));
  if (isChanged) {
    raceEventEmitter.emit(RACE_EVENTS.BET_RESTRICTION_UPDATED, { eventId: id, timestamp: Date.now() });
  }

  // 一覧に加えて、管理者が開いている詳細ページも再検証しないと保存が画面へ反映されない
  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${id}`);
}

export async function updateEventStatus(eventId: string, newStatus: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED') {
  await requireAdmin();

  await db.update(events).set({ status: newStatus }).where(eq(events.id, eventId));

  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${eventId}`);
}

export async function getEvent(id: string) {
  await requireAdmin();

  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
  });
  if (!event) return undefined;

  const typeRows = await db
    .select({ betType: eventDefaultAllowedBetTypes.betType })
    .from(eventDefaultAllowedBetTypes)
    .where(eq(eventDefaultAllowedBetTypes.eventId, id));

  return { ...event, defaultAllowedBetTypes: toAllowedBetTypes(typeRows.map((r) => r.betType)) };
}
