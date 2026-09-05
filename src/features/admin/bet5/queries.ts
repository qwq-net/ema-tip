import { db } from '@/shared/db';
import { bet5Events, events, raceInstances } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';

export async function getBet5AdminData(eventId: string) {
  const [event, races, bet5Event] = await Promise.all([
    db.query.events.findFirst({
      where: eq(events.id, eventId),
    }),
    db.query.raceInstances.findMany({
      where: eq(raceInstances.eventId, eventId),
      orderBy: (raceInstances, { asc }) => [asc(raceInstances.raceNumber), asc(raceInstances.name)],
      with: {
        entries: {
          columns: {
            id: true,
          },
        },
      },
    }),
    db.query.bet5Events.findFirst({
      where: eq(bet5Events.eventId, eventId),
    }),
  ]);

  if (!event) return null;

  const horseMap: Record<string, { horseNumber: number | null; name: string }> = {};

  if (bet5Event) {
    const targetRaceIds = [
      bet5Event.race1Id,
      bet5Event.race2Id,
      bet5Event.race3Id,
      bet5Event.race4Id,
      bet5Event.race5Id,
    ];

    const entries = await db.query.raceEntries.findMany({
      where: (raceEntries, { inArray }) => inArray(raceEntries.raceId, targetRaceIds),
      with: {
        horse: {
          columns: {
            name: true,
          },
        },
      },
    });

    entries.forEach((entry) => {
      horseMap[entry.horseId] = {
        horseNumber: entry.horseNumber,
        name: entry.horse.name,
      };
    });
  }

  return {
    event,
    races,
    bet5Event,
    horseMap,
  };
}
