'use server';

import { db } from '@/shared/db';
import { bets, horses, raceEntries, raceInstances } from '@/shared/db/schema';
import { requireAdmin, revalidateRacePaths } from '@/shared/utils/admin';
import { calculateBracketNumber } from '@/shared/utils/bracket';
import { count, eq, notInArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getRacesForSelect() {
  await requireAdmin();

  // UIは頭数しか使わないため、全entriesを載せず件数だけ返す
  const [allRaces, entryCounts] = await Promise.all([
    db.query.raceInstances.findMany({
      where: eq(raceInstances.status, 'SCHEDULED'),
      columns: {
        id: true,
        eventId: true,
        name: true,
        raceNumber: true,
        distance: true,
        surface: true,
        condition: true,
        finalizedAt: true,
        date: true,
      },
      with: {
        event: true,
        venue: {
          columns: {
            name: true,
            shortName: true,
          },
        },
      },
      orderBy: (raceInstances, { asc, desc }) => [
        desc(raceInstances.date),
        asc(raceInstances.raceNumber),
        asc(raceInstances.name),
      ],
    }),
    db.select({ raceId: raceEntries.raceId, entryCount: count() }).from(raceEntries).groupBy(raceEntries.raceId),
  ]);

  const countByRace = new Map(entryCounts.map((c) => [c.raceId, c.entryCount]));

  const eventsMap = new Map<
    string,
    {
      id: string;
      name: string;
      date: string;
      status: string;
      races: Array<{
        id: string;
        name: string;
        raceNumber: number | null;
        distance: number;
        surface: string;
        condition: string | null;
        entryCount: number;
        venue: {
          name: string;
          shortName: string;
        };
        date: string;
      }>;
    }
  >();

  for (const race of allRaces) {
    if (!eventsMap.has(race.eventId)) {
      eventsMap.set(race.eventId, {
        id: race.event.id,
        name: race.event.name,
        date: race.event.date,
        status: race.event.status,
        races: [],
      });
    }
    eventsMap.get(race.eventId)!.races.push({
      id: race.id,
      name: race.name,
      raceNumber: race.raceNumber,
      distance: race.distance,
      surface: race.surface,
      condition: race.condition,
      entryCount: countByRace.get(race.id) ?? 0,
      venue: {
        name: race.venue?.name || '',
        shortName: race.venue?.shortName || '',
      },
      date: race.date,
    });
  }

  return Array.from(eventsMap.values());
}

export async function getHorsesForSelect() {
  await requireAdmin();

  return db.select({ id: horses.id, name: horses.name }).from(horses).orderBy(horses.name);
}

export async function getRaceById(raceId: string) {
  return db.query.raceInstances.findFirst({
    where: eq(raceInstances.id, raceId),
    with: {
      event: true,
      venue: true,
    },
  });
}

export async function getEntriesForRace(raceId: string) {
  return db
    .select({
      id: raceEntries.id,
      horseId: raceEntries.horseId,
      bracketNumber: raceEntries.bracketNumber,
      horseNumber: raceEntries.horseNumber,
      horseName: horses.name,
      horseGender: horses.gender,
      horseAge: horses.age,
      finishPosition: raceEntries.finishPosition,
      status: raceEntries.status,
    })
    .from(raceEntries)
    .innerJoin(horses, eq(raceEntries.horseId, horses.id))
    .where(eq(raceEntries.raceId, raceId))
    .orderBy(raceEntries.horseNumber);
}

export async function getAvailableHorses(raceId: string) {
  const existingEntries = await db
    .select({ horseId: raceEntries.horseId })
    .from(raceEntries)
    .where(eq(raceEntries.raceId, raceId));

  const existingHorseIds = existingEntries.map((e) => e.horseId);

  if (existingHorseIds.length === 0) {
    return db
      .select({ id: horses.id, name: horses.name, gender: horses.gender, age: horses.age })
      .from(horses)
      .orderBy(horses.name);
  }

  return db
    .select({ id: horses.id, name: horses.name, gender: horses.gender, age: horses.age })
    .from(horses)
    .where(notInArray(horses.id, existingHorseIds))
    .orderBy(horses.name);
}

export async function saveEntries(raceId: string, horseIds: string[]) {
  await requireAdmin();

  await db.transaction(async (tx) => {
    // 全削除して馬番を振り直すため、締切後・確定後のレースを触ると着順や払戻の根拠が消えてしまう
    const race = await tx.query.raceInstances.findFirst({
      where: eq(raceInstances.id, raceId),
      columns: { status: true },
    });
    if (!race) {
      throw new Error('レースが見つかりません');
    }
    if (race.status !== 'SCHEDULED') {
      throw new Error('出走前のレースのみ出走馬を変更できます');
    }

    // 全削除して馬番を振り直すため、ベットが存在すると既存ベットの馬番の意味が変わってしまう
    const existingBet = await tx.query.bets.findFirst({
      where: eq(bets.raceId, raceId),
      columns: { id: true },
    });
    if (existingBet) {
      throw new Error('このレースには既にベットが存在するため、出走馬を変更できません');
    }

    await tx.delete(raceEntries).where(eq(raceEntries.raceId, raceId));

    if (horseIds.length > 0) {
      const totalHorses = horseIds.length;
      const entries = horseIds.map((horseId, index) => ({
        raceId,
        horseId,
        horseNumber: index + 1,
        bracketNumber: calculateBracketNumber(index + 1, totalHorses),
      }));

      await tx.insert(raceEntries).values(entries);
    }
  });

  revalidatePath(`/admin/entries/${raceId}`);
  revalidatePath('/admin/entries');
  revalidateRacePaths(raceId);
}
