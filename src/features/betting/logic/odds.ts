import { isRefundedBet } from '@/entities/bet/lib/payout';
import { db } from '@/shared/db';
import { bets, raceEntries, raceInstances, raceOdds } from '@/shared/db/schema';
import { redis } from '@/shared/lib/redis';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { eq } from 'drizzle-orm';

import { aggregateOddsPool, BET_TYPES, calculateProvisionalOdds } from '@/entities/bet';

const THROTTLE_SECONDS = 10;

export async function calculateOdds(raceId: string) {
  const race = await db.query.raceInstances.findFirst({
    where: eq(raceInstances.id, raceId),
    columns: { fixedOddsMode: true },
  });

  if (race?.fixedOddsMode) return;

  const raceBets = await db.query.bets.findMany({
    where: eq(bets.raceId, raceId),
  });

  const winBets = raceBets.filter((bet) => bet.details.type === 'win');

  // 暫定オッズ計算と同一ロジックに統合。キーは "[3]" 形式で返るため馬番文字列に戻す
  const provisionalWin = calculateProvisionalOdds(aggregateOddsPool(winBets))[BET_TYPES.WIN] ?? {};
  const winOdds = Object.fromEntries(
    // SAFETY: key は normalizeSelections が number[] を JSON.stringify したもの
    Object.entries(provisionalWin).map(([key, rate]) => [String((JSON.parse(key) as number[])[0]), rate])
  );

  await db
    .insert(raceOdds)
    .values({
      raceId,
      winOdds,
      placeOdds: {},
    })
    .onConflictDoUpdate({
      target: raceOdds.raceId,
      set: {
        winOdds,
        placeOdds: {},
        updatedAt: new Date(),
      },
    });

  const lastNotificationKey = `race:${raceId}:last_odds_notification`;
  const updateScheduledKey = `race:${raceId}:update_scheduled`;

  const isThrottled = await redis.get(lastNotificationKey);

  if (!isThrottled) {
    raceEventEmitter.emit(RACE_EVENTS.RACE_ODDS_UPDATED, {
      raceId,
      data: { winOdds, placeOdds: {}, updatedAt: new Date() },
    });
    await redis.set(lastNotificationKey, 'true', 'EX', THROTTLE_SECONDS);
  } else {
    const ttl = await redis.ttl(lastNotificationKey);
    const delay = ttl > 0 ? ttl * 1000 : 0;

    const result = await redis.set(updateScheduledKey, 'true', 'EX', ttl + 1, 'NX');

    if (result === 'OK') {
      setTimeout(async () => {
        try {
          const latestOdds = await getRaceOdds(raceId);
          if (latestOdds) {
            console.log(`[Odds] Executing trailing edge update for race: ${raceId}`);
            raceEventEmitter.emit(RACE_EVENTS.RACE_ODDS_UPDATED, {
              raceId,
              data: {
                winOdds: latestOdds.winOdds,
                placeOdds: latestOdds.placeOdds,
                updatedAt: latestOdds.updatedAt,
              },
            });
            await redis.set(lastNotificationKey, 'true', 'EX', THROTTLE_SECONDS);
          }
        } catch (error) {
          console.error('[Odds] Failed to execute trailing edge update:', error);
        } finally {
          await redis.del(updateScheduledKey);
        }
      }, delay);
    }
  }
}

export async function calculateAllProvisionalOdds(raceId: string) {
  const [raceBetsRaw, race, entriesInRace] = await Promise.all([
    db.query.bets.findMany({
      where: eq(bets.raceId, raceId),
    }),
    db.query.raceInstances.findFirst({
      where: eq(raceInstances.id, raceId),
      columns: { guaranteedOdds: true, fixedOddsMode: true },
    }),
    db.query.raceEntries.findMany({
      where: eq(raceEntries.raceId, raceId),
      columns: { horseNumber: true, bracketNumber: true, status: true },
    }),
  ]);

  if (race?.fixedOddsMode) return {};

  const invalidHorseIds = new Set(
    entriesInRace.filter((e) => e.status === 'SCRATCHED' || e.status === 'EXCLUDED').map((e) => e.horseNumber!)
  );
  const validBrackets = new Set(
    entriesInRace
      .filter((e) => e.status === 'ENTRANT')
      .map((e) => e.bracketNumber!)
      .filter((b): b is number => b !== null)
  );

  const raceBets = raceBetsRaw.filter(
    (bet) => !isRefundedBet(bet.details.type, bet.details.selections, invalidHorseIds, validBrackets)
  );

  const pool = aggregateOddsPool(raceBets);
  return calculateProvisionalOdds(pool, race?.guaranteedOdds || undefined);
}

export async function getRaceOdds(raceId: string) {
  return db.query.raceOdds.findFirst({
    where: eq(raceOdds.raceId, raceId),
  });
}
