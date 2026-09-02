'use server';

import { RACE_GRADES, RACE_SURFACES, RACE_TYPES, VENUE_DIRECTIONS } from '@/shared/constants/race';
import { db } from '@/shared/db';
import { raceDefinitions } from '@/shared/db/schema';
import { requireAdmin } from '@/shared/utils/admin';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const raceDefinitionSchema = z.object({
  name: z.string().min(1, 'レース名は必須です'),
  code: z.string().nullable().optional(),
  grade: z.enum(RACE_GRADES),
  type: z.enum(RACE_TYPES),
  direction: z.enum(VENUE_DIRECTIONS),
  defaultDistance: z.coerce.number().min(100, '距離は100m以上で入力してください'),
  defaultVenueId: z.string().min(1, '開催会場は必須です'),
  defaultSurface: z.enum(RACE_SURFACES),
});

export async function createRaceDefinition(formData: FormData) {
  await requireAdmin();

  const parse = raceDefinitionSchema.safeParse({
    name: formData.get('name'),
    code: formData.get('code'),
    grade: formData.get('grade'),
    type: formData.get('type'),
    direction: formData.get('direction'),
    defaultDistance: formData.get('defaultDistance'),
    defaultVenueId: formData.get('defaultVenueId'),
    defaultSurface: formData.get('defaultSurface'),
  });

  if (!parse.success) {
    throw new Error('入力内容が無効です');
  }

  await db.insert(raceDefinitions).values({
    name: parse.data.name,
    code: parse.data.code || null,
    grade: parse.data.grade,
    type: parse.data.type,
    defaultDirection: parse.data.direction,
    defaultDistance: parse.data.defaultDistance,
    defaultVenueId: parse.data.defaultVenueId,
    defaultSurface: parse.data.defaultSurface,
  });

  revalidatePath('/admin/race-definitions');
}

export async function updateRaceDefinition(id: string, formData: FormData) {
  await requireAdmin();

  const parse = raceDefinitionSchema.safeParse({
    name: formData.get('name'),
    code: formData.get('code'),
    grade: formData.get('grade'),
    type: formData.get('type'),
    direction: formData.get('direction'),
    defaultDistance: formData.get('defaultDistance'),
    defaultVenueId: formData.get('defaultVenueId'),
    defaultSurface: formData.get('defaultSurface'),
  });

  if (!parse.success) {
    console.error('Validation Error:', parse.error.format());
    throw new Error('入力内容が無効です');
  }

  await db
    .update(raceDefinitions)
    .set({
      name: parse.data.name,
      code: parse.data.code || null,
      grade: parse.data.grade,
      type: parse.data.type,
      defaultDirection: parse.data.direction,
      defaultDistance: parse.data.defaultDistance,
      defaultVenueId: parse.data.defaultVenueId,
      defaultSurface: parse.data.defaultSurface,
    })
    .where(eq(raceDefinitions.id, id));

  revalidatePath('/admin/race-definitions');
}

export async function deleteRaceDefinition(id: string) {
  await requireAdmin();

  await db.delete(raceDefinitions).where(eq(raceDefinitions.id, id));

  revalidatePath('/admin/race-definitions');
}

export async function getRaceDefinition(id: string) {
  await requireAdmin();

  const definition = await db.query.raceDefinitions.findFirst({
    where: eq(raceDefinitions.id, id),
    with: {
      defaultVenue: true,
    },
  });

  if (!definition) {
    throw new Error('指定されたレース定義が見つかりません');
  }

  return definition;
}

export async function getRaceDefinitions() {
  await requireAdmin();

  return db.query.raceDefinitions.findMany({
    orderBy: (raceDefinitions, { asc }) => [asc(raceDefinitions.code), asc(raceDefinitions.name)],
    with: {
      defaultVenue: true,
    },
  });
}
