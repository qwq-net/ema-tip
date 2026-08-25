'use server';

import { db } from '@/shared/db';
import { events } from '@/shared/db/schema';
import { desc } from 'drizzle-orm';

export async function getRaces() {
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
  return db.select().from(events).orderBy(desc(events.date), desc(events.createdAt), events.name);
}
