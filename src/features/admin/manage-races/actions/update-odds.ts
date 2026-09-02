'use server';

import { db } from '@/shared/db';
import { raceInstances } from '@/shared/db/schema';
import { requireAdmin } from '@/shared/utils/admin';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateGuaranteedOdds(raceId: string, guaranteedOdds: Record<string, number>) {
  await requireAdmin();

  await db.update(raceInstances).set({ guaranteedOdds }).where(eq(raceInstances.id, raceId));

  revalidatePath(`/admin/races/${raceId}`);
}
