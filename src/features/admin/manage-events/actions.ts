'use server';

import { BET_TYPE_ORDER, toAllowedBetTypes } from '@/entities/bet';
import { db } from '@/shared/db';
import { eventDefaultAllowedBetTypes, events, raceAllowedBetTypes, raceInstances, wallets } from '@/shared/db/schema';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { ActionError, runAction } from '@/shared/utils/action-result';
import { requireAdmin } from '@/shared/utils/admin';
import { firstRow } from '@/shared/utils/first-row';
import { formString } from '@/shared/utils/form';
import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { cache } from 'react';
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
        const parsed: unknown = JSON.parse(String(value));
        return parsed;
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
    description: formString(formData, 'description') || undefined,
    distributeAmount: formData.get('distributeAmount'),
    loanAmount: formData.get('loanAmount') || undefined,
    loanEnabled: formData.get('loanEnabled'),
    loanThresholdPercent: formData.get('loanThresholdPercent'),
    date: formData.get('date'),
    allowedBetTypes: formData.get('allowedBetTypes'),
  });

  if (!parse.success) {
    throw new ActionError('入力内容が無効です');
  }

  // キャリーオーバーは前イベントからの「移動」。コピー元を残すと複数イベント作成時に二重計上される
  await db.transaction(async (tx) => {
    const lastEvent = await tx.query.events.findFirst({
      orderBy: (events, { desc }) => [desc(events.date), desc(events.createdAt)],
    });

    const carryover = lastEvent?.carryoverAmount ?? 0;

    const insertedEvents = await tx
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
    const created = firstRow(insertedEvents, 'イベント');

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

/**
 * イベントの既定券種の変更を、それが実際に効くレースへ SSE で通知する。
 * デフォルトが効くのは自前の制限を持たないレースだけで、個別指定のレースでは購入可能な種別が変わらない。
 * イベント単位で一斉に通知すると、個別指定のレースを見ている利用者にも変更なしの通知が届く。
 */
async function notifyDefaultBetTypesChanged(eventId: string): Promise<void> {
  // 制限行を持つレースは結合先が埋まるため、null 行だけが自前の制限を持たないレースになる
  const affectedRaces = await db
    .select({ id: raceInstances.id })
    .from(raceInstances)
    .leftJoin(raceAllowedBetTypes, eq(raceAllowedBetTypes.raceId, raceInstances.id))
    .where(and(eq(raceInstances.eventId, eventId), isNull(raceAllowedBetTypes.raceId)));

  for (const race of affectedRaces) {
    raceEventEmitter.emit(RACE_EVENTS.BET_RESTRICTION_UPDATED, { raceId: race.id, timestamp: Date.now() });
  }
}

export async function updateEvent(id: string, formData: FormData) {
  return runAction(async () => {
    await requireAdmin();

    const parse = eventSchema.safeParse({
      name: formData.get('name'),
      description: formString(formData, 'description') || undefined,
      distributeAmount: formData.get('distributeAmount'),
      loanAmount: formData.get('loanAmount') || undefined,
      loanEnabled: formData.get('loanEnabled'),
      loanThresholdPercent: formData.get('loanThresholdPercent'),
      date: formData.get('date'),
      allowedBetTypes: formData.get('allowedBetTypes'),
    });

    if (!parse.success) {
      throw new ActionError('入力内容が無効です');
    }

    // ウォレットは参加時点の配布金額で作られる。参加者がいる状態で変えると収支の基準が全員分ずれるため、変更は参加者が出る前だけ受け付ける
    const current = await db.query.events.findFirst({ where: eq(events.id, id), columns: { distributeAmount: true } });
    if (!current) {
      throw new ActionError('イベントが見つかりません');
    }
    if (current.distributeAmount !== parse.data.distributeAmount) {
      const participant = await db.query.wallets.findFirst({ where: eq(wallets.eventId, id), columns: { id: true } });
      if (participant) {
        throw new ActionError('参加者がいるため配布金額は変更できません');
      }
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
      await notifyDefaultBetTypesChanged(id);
    }

    // 一覧に加えて、管理者が開いている詳細ページも再検証しないと保存が画面へ反映されない
    revalidatePath('/admin/events');
    revalidatePath(`/admin/events/${id}`);
  });
}

export async function updateEventStatus(eventId: string, newStatus: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED') {
  await requireAdmin();

  await db.update(events).set({ status: newStatus }).where(eq(events.id, eventId));

  revalidatePath('/admin/events');
  // ヘッダーの状態表示はレイアウトが持つため、配下のタブごと作り直す
  revalidatePath(`/admin/events/${eventId}`, 'layout');
}

/** イベント 1 件を既定券種つきで返す。レイアウトと配下ページが同一リクエスト内で二重取得するため cache で束ねる。 */
export const getEvent = cache(async (id: string) => {
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
});
