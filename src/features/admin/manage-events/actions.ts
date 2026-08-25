'use server';

import { db } from '@/shared/db';
import { events } from '@/shared/db/schema';
import { requireAdmin } from '@/shared/utils/admin';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { z } from 'zod';

const eventSchema = z.object({
  name: z.string().min(1, 'イベント名は必須です'),
  description: z.string().optional(),
  distributeAmount: z.coerce.number().min(0, '金額は0以上である必要があります'),
  loanAmount: z.coerce.number().min(0).optional().nullable(),
  date: z.string(),
});

export async function createEvent(formData: FormData) {
  await requireAdmin();

  const parse = eventSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description')?.toString() || undefined,
    distributeAmount: formData.get('distributeAmount'),
    loanAmount: formData.get('loanAmount') || undefined,
    date: formData.get('date'),
  });

  if (!parse.success) {
    throw new Error('無効な入力です: ' + JSON.stringify(parse.error.flatten()));
  }

  const lastEvent = await db.query.events.findFirst({
    orderBy: (events, { desc }) => [desc(events.date), desc(events.createdAt)],
  });

  const carryover = lastEvent ? Number(lastEvent.carryoverAmount) : 0;

  await db.insert(events).values({
    name: parse.data.name,
    description: parse.data.description,
    distributeAmount: parse.data.distributeAmount,
    date: parse.data.date,
    status: 'SCHEDULED',
    carryoverAmount: carryover,
    loanAmount: parse.data.loanAmount ?? null,
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
    date: formData.get('date'),
  });

  if (!parse.success) {
    throw new Error('無効な入力です: ' + JSON.stringify(parse.error.flatten()));
  }

  await db
    .update(events)
    .set({
      name: parse.data.name,
      description: parse.data.description,
      distributeAmount: parse.data.distributeAmount,
      loanAmount: parse.data.loanAmount ?? null,
      date: parse.data.date,
    })
    .where(eq(events.id, id));

  revalidatePath('/admin/events');
}

export async function updateEventStatus(eventId: string, newStatus: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED') {
  await requireAdmin();

  await db.update(events).set({ status: newStatus }).where(eq(events.id, eventId));

  revalidatePath('/admin/events');
}

export async function getEvent(id: string) {
  await requireAdmin();

  return db.query.events.findFirst({
    where: eq(events.id, id),
  });
}
