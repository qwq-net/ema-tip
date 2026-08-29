'use server';

import { HORSE_TAG_TYPES, HORSE_TYPES } from '@/shared/constants/horse';
import { db } from '@/shared/db';
import { horseTags, horses } from '@/shared/db/schema';
import { requireAdmin } from '@/shared/utils/admin';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const horseSchema = z.object({
  name: z.string().min(1),
  gender: z.enum(['牡', '牝', 'セン']),
  age: z.coerce.number().min(2).max(20).optional(),
  origin: z.enum(['DOMESTIC', 'FOREIGN_BRED', 'FOREIGN_TRAINED']),
  notes: z.string().optional(),
  type: z.enum(HORSE_TYPES).default('REAL'),
  tags: z
    .string()
    .transform((str) => {
      try {
        return JSON.parse(str);
      } catch {
        return [];
      }
    })
    .pipe(z.array(z.object({ type: z.enum(HORSE_TAG_TYPES), content: z.string() })))
    .optional(),
});

const GENDER_MAP = {
  牡: 'HORSE',
  牝: 'MARE',
  セン: 'GELDING',
} satisfies Record<string, 'MARE' | 'FILLY' | 'HORSE' | 'COLT' | 'GELDING'>;

export async function createHorse(formData: FormData) {
  await requireAdmin();

  const ageValue = formData.get('age');
  const notesValue = formData.get('notes');
  const parse = horseSchema.safeParse({
    name: formData.get('name'),
    gender: formData.get('gender'),
    age: ageValue && ageValue !== '' ? ageValue : undefined,
    origin: formData.get('origin'),
    notes: notesValue && notesValue !== '' ? notesValue : undefined,
    type: formData.get('type') || 'REAL',
    tags: formData.get('tags') || '[]',
  });

  if (!parse.success) {
    console.error(parse.error);
    throw new Error('入力内容が無効です');
  }

  const genderInput = parse.data.gender;
  const gender = GENDER_MAP[genderInput];

  const [horse] = await db
    .insert(horses)
    .values({
      name: parse.data.name,
      gender: gender,
      age: parse.data.age,
      origin: parse.data.origin,
      notes: parse.data.notes,
      type: parse.data.type,
    })
    .returning();

  if (parse.data.tags && parse.data.tags.length > 0) {
    await db.insert(horseTags).values(
      parse.data.tags.map((tag) => ({
        horseId: horse.id,
        type: tag.type,
        content: tag.content,
      }))
    );
  }

  revalidatePath('/admin/horses');
}

export async function updateHorse(id: string, formData: FormData) {
  await requireAdmin();

  const ageValue = formData.get('age');
  const notesValue = formData.get('notes');
  const parse = horseSchema.safeParse({
    name: formData.get('name'),
    gender: formData.get('gender'),
    age: ageValue && ageValue !== '' ? ageValue : undefined,
    origin: formData.get('origin'),
    notes: notesValue && notesValue !== '' ? notesValue : undefined,
    type: formData.get('type') || 'REAL',
    tags: formData.get('tags') || '[]',
  });

  if (!parse.success) {
    console.error(parse.error);
    throw new Error('入力内容が無効です');
  }

  const genderInput = parse.data.gender;
  const gender = GENDER_MAP[genderInput];

  await db.transaction(async (tx) => {
    await tx
      .update(horses)
      .set({
        name: parse.data.name,
        gender: gender,
        age: parse.data.age,
        origin: parse.data.origin,
        notes: parse.data.notes,
        type: parse.data.type,
      })
      .where(eq(horses.id, id));

    await tx.delete(horseTags).where(eq(horseTags.horseId, id));

    if (parse.data.tags && parse.data.tags.length > 0) {
      await tx.insert(horseTags).values(
        parse.data.tags.map((tag) => ({
          horseId: id,
          type: tag.type,
          content: tag.content,
        }))
      );
    }
  });

  revalidatePath('/admin/horses');
}

export async function getHorses() {
  await requireAdmin();

  return db.query.horses.findMany({
    with: {
      tags: true,
    },
    orderBy: (horses, { asc }) => [asc(horses.name)],
  });
}

export async function deleteHorse(id: string) {
  await requireAdmin();

  await db.delete(horses).where(eq(horses.id, id));

  revalidatePath('/admin/horses');
}

export async function getHorse(id: string) {
  await requireAdmin();

  const horse = await db.query.horses.findFirst({
    where: eq(horses.id, id),
    with: {
      tags: true,
    },
  });

  if (!horse) {
    throw new Error('指定された馬が見つかりません');
  }

  return horse;
}
