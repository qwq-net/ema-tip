'use server';

import { VENUE_AREAS, VENUE_DIRECTIONS } from '@/shared/constants/race';
import { db } from '@/shared/db';
import { raceDefinitions, raceInstances, venues } from '@/shared/db/schema';
import { ActionError, requireAdmin, runAction } from '@/shared/utils/admin';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const venueSchema = z.object({
  name: z.string().min(1, '競馬場名は必須です'),
  shortName: z.string().min(1, '略称は必須です').max(3, '略称は3文字以内で入力してください'),
  code: z.string().optional(),
  direction: z.enum(VENUE_DIRECTIONS),
  area: z.enum(VENUE_AREAS),
});

export async function createVenue(formData: FormData) {
  await requireAdmin();

  const parse = venueSchema.safeParse({
    name: formData.get('name'),
    shortName: formData.get('shortName'),
    code: formData.get('code'),
    direction: formData.get('direction'),
    area: formData.get('area'),
  });

  if (!parse.success) {
    throw new Error('入力内容が無効です');
  }

  await db.insert(venues).values({
    name: parse.data.name,
    shortName: parse.data.shortName,
    code: parse.data.code,
    defaultDirection: parse.data.direction,
    area: parse.data.area,
  });

  revalidatePath('/admin/venues');
}

export async function updateVenue(id: string, formData: FormData) {
  await requireAdmin();

  const parse = venueSchema.safeParse({
    name: formData.get('name'),
    shortName: formData.get('shortName'),
    code: formData.get('code'),
    direction: formData.get('direction'),
    area: formData.get('area'),
  });

  if (!parse.success) {
    throw new Error('入力内容が無効です');
  }

  await db
    .update(venues)
    .set({
      name: parse.data.name,
      shortName: parse.data.shortName,
      code: parse.data.code,
      defaultDirection: parse.data.direction,
      area: parse.data.area,
    })
    .where(eq(venues.id, id));

  revalidatePath('/admin/venues');
}

// 競馬場を削除する。レースかレース定義から参照されている競馬場は FK 違反になる前に止め、
// { success: false, error } で返す
export async function deleteVenue(id: string) {
  return runAction(async () => {
    await requireAdmin();

    const [race, definition] = await Promise.all([
      db.query.raceInstances.findFirst({ where: eq(raceInstances.venueId, id), columns: { id: true } }),
      db.query.raceDefinitions.findFirst({ where: eq(raceDefinitions.defaultVenueId, id), columns: { id: true } }),
    ]);
    if (race || definition) {
      throw new ActionError('レースまたはレース定義で使用中の競馬場は削除できません');
    }

    await db.delete(venues).where(eq(venues.id, id));

    revalidatePath('/admin/venues');
  });
}

export async function getVenues() {
  await requireAdmin();

  return db.select().from(venues).orderBy(venues.code, venues.name);
}

export async function getVenue(id: string) {
  await requireAdmin();

  const result = await db.select().from(venues).where(eq(venues.id, id)).limit(1);
  return result[0] ?? null;
}
