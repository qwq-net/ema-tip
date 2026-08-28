'use server';

import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { forecasts } from '@/shared/db/schema';
import { canManageForecasts } from '@/shared/utils/auth-helpers';
import { requireUser } from '@/shared/utils/admin';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export type ForecastSelection = Record<string, string>;

export async function upsertForecast(raceId: string, selections: ForecastSelection, comment: string) {
  const session = await auth();
  if (!session?.user?.id || !canManageForecasts(session.user)) {
    throw new Error('Unauthorized');
  }

  await db
    .insert(forecasts)
    .values({
      raceId,
      userId: session.user.id,
      selections,
      comment,
    })
    .onConflictDoUpdate({
      target: [forecasts.raceId, forecasts.userId],
      set: { selections, comment },
    });

  revalidatePath(`/admin/forecasts`);
  revalidatePath(`/races/${raceId}`);
}

export async function getForecastsByRaceId(raceId: string) {
  await requireUser();

  const data = await db.query.forecasts.findMany({
    where: eq(forecasts.raceId, raceId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          image: true,
          role: true,
        },
      },
    },
    orderBy: (forecasts, { desc }) => [desc(forecasts.updatedAt)],
  });

  return data;
}

export async function getMyForecast(raceId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const data = await db.query.forecasts.findFirst({
    where: and(eq(forecasts.raceId, raceId), eq(forecasts.userId, session.user.id)),
  });

  return data;
}
