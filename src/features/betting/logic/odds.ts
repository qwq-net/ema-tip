import { getDefaultGuaranteedOdds, resolveGuaranteedOdds } from '@/entities/race/lib/guaranteed-odds';
import { db } from '@/shared/db';
import { bets, raceEntries, raceInstances, raceOdds } from '@/shared/db/schema';
import { redis } from '@/shared/lib/redis';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  aggregateOddsPool,
  BET_TYPES,
  calculatePlaceOddsRange,
  calculateProvisionalOdds,
  calculateWinPopularity,
  isRefundedBet,
  parseSelectionKey,
  resolveInvalidSelections,
} from '@/entities/bet';

const THROTTLE_SECONDS = 10;
const PROVISIONAL_ODDS_CACHE_SECONDS = 10;

// キャッシュした暫定オッズの形。券種 → 選択肢キー → 倍率
const provisionalOddsCacheSchema = z.record(z.string(), z.record(z.string(), z.number()));

export async function calculateOdds(raceId: string) {
  const [race, defaultGuaranteedOdds] = await Promise.all([
    db.query.raceInstances.findFirst({
      where: eq(raceInstances.id, raceId),
      columns: { fixedOddsMode: true, guaranteedOdds: true },
    }),
    getDefaultGuaranteedOdds(),
  ]);

  if (race?.fixedOddsMode) return;

  const guaranteedOdds = resolveGuaranteedOdds(defaultGuaranteedOdds, race?.guaranteedOdds);

  // 購入のたびに呼ばれるホットパス。表示に使う単勝・複勝オッズだけ計算するため、
  // SQL側で両ベットに絞り、必要な2カラムだけ取得して転送量を抑える
  const raceBets = await db.query.bets.findMany({
    where: and(eq(bets.raceId, raceId), sql`${bets.details}->>'type' IN ('win', 'place')`),
    columns: { details: true, amount: true },
  });

  const displayBets = raceBets.filter((bet) => bet.details.type === 'win' || bet.details.type === 'place');

  // 暫定オッズ計算と同一ロジックに統合。キーは "[3]" 形式で返るため馬番文字列に戻す。
  // 保証オッズも適用し、表示オッズが実際の払戻下限を下回らないようにする
  const pool = aggregateOddsPool(displayBets);
  const provisionalWin = calculateProvisionalOdds(pool, guaranteedOdds)[BET_TYPES.WIN] ?? {};
  const toHorseNumberKey = (key: string) => String(parseSelectionKey(key)[0]);
  const winOdds = Object.fromEntries(
    Object.entries(provisionalWin).map(([key, rate]) => [toHorseNumberKey(key), rate])
  );
  // 人気順は丸め済みオッズでなく賭け金額から算出し、表示上の同オッズでも順位が付く
  const winPopularity = Object.fromEntries(
    Object.entries(
      calculateWinPopularity(pool.amountBySelection[BET_TYPES.WIN] ?? {}, pool.countBySelection[BET_TYPES.WIN] ?? {})
    ).map(([key, rank]) => [toHorseNumberKey(key), rank])
  );
  const placeAmountByHorse = Object.fromEntries(
    Object.entries(pool.amountBySelection[BET_TYPES.PLACE] ?? {}).map(([key, amount]) => [
      toHorseNumberKey(key),
      amount,
    ])
  );
  const placeOdds = calculatePlaceOddsRange(placeAmountByHorse, guaranteedOdds[BET_TYPES.PLACE]);

  await db
    .insert(raceOdds)
    .values({
      raceId,
      winOdds,
      winPopularity,
      placeOdds,
    })
    .onConflictDoUpdate({
      target: raceOdds.raceId,
      set: {
        winOdds,
        winPopularity,
        placeOdds,
        updatedAt: new Date(),
      },
    });

  const lastNotificationKey = `race:${raceId}:last_odds_notification`;
  const updateScheduledKey = `race:${raceId}:update_scheduled`;

  // SET NX で即時通知の権利を 1 回だけ取る。読んでから書く方式だと、
  // app が複数プロセスで同時に購入を受けた時に両方が通知して重複する
  const acquired = await redis.set(lastNotificationKey, 'true', 'EX', THROTTLE_SECONDS, 'NX');

  // NX に負けた直後にキーが失効すると ttl は -2 になる。負の EX で set が失敗して配信ごと落ちるので、
  // 失効済みは即時通知の権利が空いたものとみなし、取れた場合と同じく即時に通知する
  const ttl = acquired === 'OK' ? THROTTLE_SECONDS : await redis.ttl(lastNotificationKey);

  if (acquired === 'OK' || ttl <= 0) {
    raceEventEmitter.emit(RACE_EVENTS.RACE_ODDS_UPDATED, {
      raceId,
      data: { winOdds, winPopularity, placeOdds, updatedAt: new Date() },
    });
  } else {
    const result = await redis.set(updateScheduledKey, 'true', 'EX', ttl + 1, 'NX');

    if (result === 'OK') {
      const runTrailingUpdate = async () => {
        try {
          const latestOdds = await getRaceOdds(raceId);
          if (latestOdds) {
            console.info(`[Odds] Executing trailing edge update for race: ${raceId}`);
            raceEventEmitter.emit(RACE_EVENTS.RACE_ODDS_UPDATED, {
              raceId,
              data: {
                // jsonb 列は nullable だが RaceOddsData は非 null 宣言なので空オブジェクトへ丸める。
                // 受け手が null を想定せずに済み、SSE のペイロードを後から検証しやすくなる
                winOdds: latestOdds.winOdds ?? {},
                winPopularity: latestOdds.winPopularity,
                placeOdds: latestOdds.placeOdds ?? {},
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
      };
      setTimeout(() => {
        runTrailingUpdate().catch((cause: unknown) => {
          console.error('[Odds] Trailing edge update rejected:', cause);
        });
      }, ttl * 1000);
    }
  }
}

export async function calculateAllProvisionalOdds(raceId: string) {
  const [raceBetsRaw, race, entriesInRace, defaultGuaranteedOdds] = await Promise.all([
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
    getDefaultGuaranteedOdds(),
  ]);

  if (race?.fixedOddsMode) return {};

  const { invalidHorseIds, validBrackets } = resolveInvalidSelections(entriesInRace);

  const raceBets = raceBetsRaw.filter(
    (bet) => !isRefundedBet(bet.details.type, bet.details.selections, invalidHorseIds, validBrackets)
  );

  const pool = aggregateOddsPool(raceBets);
  return calculateProvisionalOdds(pool, resolveGuaranteedOdds(defaultGuaranteedOdds, race?.guaranteedOdds));
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
      const parsed = provisionalOddsCacheSchema.safeParse(JSON.parse(cached));
      // 想定と違う値が残っていたらキャッシュを無視して計算し直す。書き込みで上書きされる
      if (parsed.success) return parsed.data;
      console.error('[Odds] Ignoring provisional odds cache with unexpected shape:', parsed.error);
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
