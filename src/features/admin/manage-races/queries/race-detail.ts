import { toAllowedBetTypes } from '@/entities/bet';
import { getPayoutResults } from '@/entities/race/actions';
import { getDefaultGuaranteedOdds } from '@/entities/race/lib/guaranteed-odds';
import { getRaceById } from '@/features/admin/manage-entries/actions';
import { db } from '@/shared/db';
import {
  bet5Events,
  eventDefaultAllowedBetTypes,
  horses,
  raceAllowedBetTypes,
  raceEntries,
  raceOdds,
} from '@/shared/db/schema';
import { eq } from 'drizzle-orm';

/**
 * レース詳細画面が必要とする一式をまとめて読む。レースが見つからなければ null を返し、呼び手が notFound へ倒す。
 * 出走馬は着順・馬番の順で、オッズは単勝の 1 レコードだけを読む。
 * 券種は当レースの個別指定とイベント既定の両方を返し、どちらを使うかは画面側が決める。
 */
export async function getRaceDetailData(raceId: string) {
  const [race, payoutResults] = await Promise.all([getRaceById(raceId), getPayoutResults(raceId)]);
  if (!race) return null;

  const [entries, oddsRecord, bet5Event, raceTypeRows, eventTypeRows, defaultGuaranteedOdds] = await Promise.all([
    db
      .select({
        id: raceEntries.id,
        horseNumber: raceEntries.horseNumber,
        bracketNumber: raceEntries.bracketNumber,
        finishPosition: raceEntries.finishPosition,
        jockey: raceEntries.jockey,
        status: raceEntries.status,
        horseName: horses.name,
      })
      .from(raceEntries)
      .innerJoin(horses, eq(raceEntries.horseId, horses.id))
      .where(eq(raceEntries.raceId, raceId))
      .orderBy(raceEntries.finishPosition, raceEntries.horseNumber),
    db.query.raceOdds.findFirst({
      where: eq(raceOdds.raceId, raceId),
      columns: { winOdds: true, updatedAt: true },
    }),
    db.query.bet5Events.findFirst({
      where: eq(bet5Events.eventId, race.eventId),
      columns: {
        id: true,
        status: true,
        race1Id: true,
        race2Id: true,
        race3Id: true,
        race4Id: true,
        race5Id: true,
      },
    }),
    db
      .select({ betType: raceAllowedBetTypes.betType })
      .from(raceAllowedBetTypes)
      .where(eq(raceAllowedBetTypes.raceId, raceId)),
    db
      .select({ betType: eventDefaultAllowedBetTypes.betType })
      .from(eventDefaultAllowedBetTypes)
      .where(eq(eventDefaultAllowedBetTypes.eventId, race.eventId)),
    getDefaultGuaranteedOdds(),
  ]);

  return {
    race,
    payoutResults,
    entries,
    oddsMap: oddsRecord?.winOdds ?? {},
    oddsUpdatedAt: oddsRecord?.updatedAt,
    bet5Event,
    raceAllowed: toAllowedBetTypes(raceTypeRows.map((r) => r.betType)),
    eventDefault: toAllowedBetTypes(eventTypeRows.map((r) => r.betType)),
    defaultGuaranteedOdds,
  };
}

/** レース詳細画面へ渡すデータ。取得に失敗した null を除いた形。 */
export type RaceDetailData = NonNullable<Awaited<ReturnType<typeof getRaceDetailData>>>;
