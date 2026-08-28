'use server';

import { db } from '@/shared/db';
import { payoutResults as payoutResultsTable } from '@/shared/db/schema';
import { requireUser } from '@/shared/utils/admin';
import { eq } from 'drizzle-orm';

export async function getPayoutResults(raceId: string) {
  await requireUser();

  return db.select().from(payoutResultsTable).where(eq(payoutResultsTable.raceId, raceId));
}
