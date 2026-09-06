'use server';

import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { bets, horses, raceEntries, raceInstances } from '@/shared/db/schema';
import { requireAdmin, requireUser, revalidateRacePaths } from '@/shared/utils/admin';
import { calculateBracketNumber, MAX_HORSES_PER_RACE } from '@/shared/utils/bracket';
import { eq, notInArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';

/**
 * レース 1 件をイベント・会場つきで返す。レイアウトと配下ページが同一リクエスト内で二重取得するため cache で束ねる。
 * 未ログインには null を返す。throw すると generateMetadata 経由の呼び出しがログインページへの redirect より先に
 * 500 になるため、レース不在と同じ扱いに落とす。
 */
export const getRaceById = cache(async (raceId: string) => {
  const session = await auth();
  if (!session?.user?.id) return null;

  return db.query.raceInstances.findFirst({
    where: eq(raceInstances.id, raceId),
    with: {
      event: true,
      venue: true,
    },
  });
});

export async function getEntriesForRace(raceId: string) {
  await requireUser();

  return db
    .select({
      id: raceEntries.id,
      horseId: raceEntries.horseId,
      bracketNumber: raceEntries.bracketNumber,
      horseNumber: raceEntries.horseNumber,
      horseName: horses.name,
      horseGender: horses.gender,
      horseAge: horses.age,
      horseSource: horses.source,
      horseType: horses.type,
      finishPosition: raceEntries.finishPosition,
      status: raceEntries.status,
    })
    .from(raceEntries)
    .innerJoin(horses, eq(raceEntries.horseId, horses.id))
    .where(eq(raceEntries.raceId, raceId))
    .orderBy(raceEntries.horseNumber);
}

export async function getAvailableHorses(raceId: string) {
  await requireAdmin();

  const existingEntries = await db
    .select({ horseId: raceEntries.horseId })
    .from(raceEntries)
    .where(eq(raceEntries.raceId, raceId));

  const existingHorseIds = existingEntries.map((e) => e.horseId);

  if (existingHorseIds.length === 0) {
    return db
      .select({
        id: horses.id,
        name: horses.name,
        gender: horses.gender,
        age: horses.age,
        source: horses.source,
        type: horses.type,
      })
      .from(horses)
      .orderBy(horses.name);
  }

  return db
    .select({
      id: horses.id,
      name: horses.name,
      gender: horses.gender,
      age: horses.age,
      source: horses.source,
      type: horses.type,
    })
    .from(horses)
    .where(notInArray(horses.id, existingHorseIds))
    .orderBy(horses.name);
}

export async function saveEntries(raceId: string, horseIds: string[]) {
  await requireAdmin();

  // 19頭以上は枠番を正しく割り当てられない
  if (horseIds.length > MAX_HORSES_PER_RACE) {
    throw new Error(`出走馬は${MAX_HORSES_PER_RACE}頭まで登録できます`);
  }

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

  revalidatePath(`/admin/races/${raceId}/entries`);
  revalidateRacePaths(raceId);
}
