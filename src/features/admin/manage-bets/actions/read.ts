'use server';

import { db } from '@/shared/db';
import { bets, raceEntries } from '@/shared/db/schema';
import { requireAdmin } from '@/shared/utils/admin';
import { count, eq } from 'drizzle-orm';

export async function getEventsWithRaces() {
  await requireAdmin();

  // UIは頭数しか使わないため、全entriesを載せず件数だけ返す
  const [eventsWithRaces, entryCounts] = await Promise.all([
    db.query.events.findMany({
      orderBy: (events, { desc }) => [desc(events.date), desc(events.createdAt)],
      with: {
        races: {
          orderBy: (raceInstances, { asc }) => [asc(raceInstances.raceNumber), asc(raceInstances.name)],
          with: {
            venue: true,
          },
        },
      },
    }),
    db.select({ raceId: raceEntries.raceId, entryCount: count() }).from(raceEntries).groupBy(raceEntries.raceId),
  ]);

  const countByRace = new Map(entryCounts.map((c) => [c.raceId, c.entryCount]));

  return eventsWithRaces.map((event) => ({
    ...event,
    races: event.races.map((race) => ({ ...race, entryCount: countByRace.get(race.id) ?? 0 })),
  }));
}

export async function getBetsByRace(raceId: string) {
  await requireAdmin();

  return db.query.bets.findMany({
    where: eq(bets.raceId, raceId),
    orderBy: (bets, { desc }) => [desc(bets.createdAt)],
    with: {
      // パスワードハッシュ等を含むためカラムを明示的に絞る
      user: {
        columns: { id: true, name: true },
      },
    },
  });
}

export async function getRaceWithBets(raceId: string) {
  await requireAdmin();

  return db.query.raceInstances.findFirst({
    where: (raceInstances, { eq }) => eq(raceInstances.id, raceId),
    with: {
      event: true,
      venue: true,
    },
  });
}
