'use server';

import { db } from '@/shared/db';
import { eventDefaultAllowedBetTypes, raceAllowedBetTypes } from '@/shared/db/schema';
import { requireUser } from '@/shared/utils/admin';
import { eq } from 'drizzle-orm';
import type { BetType } from './constants';
import { resolveAllowedBetTypes } from './lib/resolve-allowed';

/**
 * レースで購入可能な馬券種別を解決して返す。
 * レース設定 → イベントのデフォルト設定の順に採用し、どちらも未設定なら null を返す。
 * null は全種別購入可を意味する。
 */
export async function getAllowedBetTypesForRace(raceId: string, eventId: string): Promise<BetType[] | null> {
  await requireUser();

  const [raceRows, eventRows] = await Promise.all([
    db
      .select({ betType: raceAllowedBetTypes.betType })
      .from(raceAllowedBetTypes)
      .where(eq(raceAllowedBetTypes.raceId, raceId)),
    db
      .select({ betType: eventDefaultAllowedBetTypes.betType })
      .from(eventDefaultAllowedBetTypes)
      .where(eq(eventDefaultAllowedBetTypes.eventId, eventId)),
  ]);

  return resolveAllowedBetTypes(
    raceRows.map((r) => r.betType),
    eventRows.map((r) => r.betType)
  );
}
