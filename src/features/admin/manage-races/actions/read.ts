'use server';

import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { events } from '@/shared/db/schema';
import { ActionError, ADMIN_ERRORS, requireAdmin } from '@/shared/utils/admin';
import { canManageForecasts } from '@/shared/utils/auth-helpers';
import { desc } from 'drizzle-orm';

// 予想管理ページで使うため TIPSTER も許可する
export async function getRaces() {
  const session = await auth();
  if (!canManageForecasts(session?.user)) {
    throw new ActionError(ADMIN_ERRORS.UNAUTHORIZED);
  }

  return db.query.raceInstances.findMany({
    orderBy: (raceInstances, { asc, desc }) => [
      desc(raceInstances.date),
      asc(raceInstances.raceNumber),
      asc(raceInstances.name),
    ],
    with: {
      event: true,
      venue: true,
      entries: true,
    },
  });
}

export async function getEvents() {
  await requireAdmin();

  return db.select().from(events).orderBy(desc(events.date), desc(events.createdAt), events.name);
}
