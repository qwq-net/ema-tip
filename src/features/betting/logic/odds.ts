import { isRefundedBet } from '@/entities/bet/lib/payout';
import { db } from '@/shared/db';
import { bets, raceEntries, raceInstances, raceOdds } from '@/shared/db/schema';
import { redis } from '@/shared/lib/redis';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { and, eq, sql } from 'drizzle-orm';

import { aggregateOddsPool, BET_TYPES, calculateProvisionalOdds } from '@/entities/bet';

const THROTTLE_SECONDS = 10;
const PROVISIONAL_ODDS_CACHE_SECONDS = 10;

export async function calculateOdds(raceId: string) {
  const race = await db.query.raceInstances.findFirst({
    where: eq(raceInstances.id, raceId),
    columns: { fixedOddsMode: true, guaranteedOdds: true },
  });

  if (race?.fixedOddsMode) return;

  // 購入のたびに呼ばれるホットパス。単勝オッズにしか使わないため、
  // SQL側で単勝ベットに絞り、必要な2カラムだけ取得して転送量を抑える
  const raceBets = await db.query.bets.findMany({
    where: and(eq(bets.raceId, raceId), sql`${bets.details}->>'type' = 'win'`),
    columns: { details: true, amount: true },
  });

  const winBets = raceBets.filter((bet) => bet.details.type === 'win');

  // 暫定オッズ計算と同一ロジックに統合。キーは "[3]" 形式で返るため馬番文字列に戻す。
  // 保証オッズも適用し、表示オッズが実際の払戻下限を下回らないようにする
  const provisionalWin =
    calculateProvisionalOdds(aggregateOddsPool(winBets), race?.guaranteedOdds || undefined)[BET_TYPES.WIN] ?? {};
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
      columns: { details: true, amount: true },
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

// 暫定オッズをレース単位で短時間キャッシュして返す。計算結果はユーザーに依存しない。
// 締切後の結果待機ページから全ユーザーが同時に呼ぶ前提で、全ベット走査をTTLごとに1回へ抑える。
// 締切後は新規ベットが入らないため、TTL 内の遅延が影響するのは出走取消の反映だけ。
// このページは元々 Redis なしで動いていたため、Redis 障害時はキャッシュを素通りして計算結果を返す
export async function getProvisionalOddsCached(raceId: string) {
  const cacheKey = `race:${raceId}:provisional_odds`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      // SAFETY: このキーには下で計算結果を JSON.stringify した値しか保存していない
      return JSON.parse(cached) as Awaited<ReturnType<typeof calculateAllProvisionalOdds>>;
    }
  } catch (err) {
    console.error('[Odds] Failed to read provisional odds cache:', err);
  }

  const odds = await calculateAllProvisionalOdds(raceId);

  try {
    await redis.set(cacheKey, JSON.stringify(odds), 'EX', PROVISIONAL_ODDS_CACHE_SECONDS);
  } catch (err) {
    console.error('[Odds] Failed to write provisional odds cache:', err);
  }

  return odds;
}

export async function getRaceOdds(raceId: string) {
  return db.query.raceOdds.findFirst({
    where: eq(raceOdds.raceId, raceId),
  });
}
