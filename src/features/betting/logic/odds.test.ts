import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { calculateAllProvisionalOdds, calculateOdds, getProvisionalOddsCached, getRaceOdds } from './odds';

vi.mock('@/shared/db', () => ({
  db: {
    query: {
      bets: { findMany: vi.fn() },
      raceInstances: { findFirst: vi.fn() },
      raceEntries: { findMany: vi.fn() },
      raceOdds: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
  },
}));

vi.mock('@/entities/bet/lib/payout', async () => {
  const actual = await vi.importActual('@/entities/bet/lib/payout');
  return {
    ...actual,
    isRefundedBet: vi.fn().mockReturnValue(false),
  };
});

vi.mock('@/shared/lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    ttl: vi.fn(),
    del: vi.fn(),
  },
}));

import { db } from '@/shared/db';
import { redis } from '@/shared/lib/redis';
import { raceEventEmitter } from '@/shared/lib/sse/event-emitter';

describe('calculateOdds', () => {
  const raceId = 'race-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    (db.insert as unknown as Mock).mockReturnValue({ values });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('単勝ベットのみを抽出してオッズ計算し、DBにupsertする', async () => {
    (db.query.bets.findMany as unknown as Mock).mockResolvedValue([
      { amount: 1000, details: { type: 'win', selections: [1] } },
      { amount: 500, details: { type: 'win', selections: [2] } },
      { amount: 2000, details: { type: 'exacta', selections: [1, 2] } },
    ]);
    (redis.get as unknown as Mock).mockResolvedValue(null);

    await calculateOdds(raceId);

    expect(db.insert).toHaveBeenCalled();
    const insertValues = (db.insert as unknown as Mock).mock.results[0].value.values;
    const valuesArg = insertValues.mock.calls[0][0];
    expect(valuesArg.raceId).toBe(raceId);
    expect(valuesArg.winOdds).toEqual({ '1': 1.5, '2': 3.0 });
  });

  it('ベットが0件の場合は空のオッズオブジェクトを保存する', async () => {
    (db.query.bets.findMany as unknown as Mock).mockResolvedValue([]);
    (redis.get as unknown as Mock).mockResolvedValue(null);

    await calculateOdds(raceId);

    const insertValues = (db.insert as unknown as Mock).mock.results[0].value.values;
    const valuesArg = insertValues.mock.calls[0][0];
    expect(valuesArg.winOdds).toEqual({});
  });

  it('同一馬番に複数ベット → 集約されてオッズが下がる', async () => {
    (db.query.bets.findMany as unknown as Mock).mockResolvedValue([
      { amount: 500, details: { type: 'win', selections: [1] } },
      { amount: 500, details: { type: 'win', selections: [1] } },
      { amount: 500, details: { type: 'win', selections: [2] } },
    ]);
    (redis.get as unknown as Mock).mockResolvedValue(null);

    await calculateOdds(raceId);

    const insertValues = (db.insert as unknown as Mock).mock.results[0].value.values;
    const valuesArg = insertValues.mock.calls[0][0];
    expect(valuesArg.winOdds['1']).toBe(1.5);
    expect(valuesArg.winOdds['2']).toBe(3.0);
  });

  it('保証オッズが設定されている場合、単勝の表示オッズが保証倍率を下回らない', async () => {
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValueOnce({
      fixedOddsMode: false,
      guaranteedOdds: { win: 5.0 },
    });
    (db.query.bets.findMany as unknown as Mock).mockResolvedValue([
      { amount: 1000, details: { type: 'win', selections: [1] } },
      { amount: 500, details: { type: 'win', selections: [2] } },
    ]);
    (redis.get as unknown as Mock).mockResolvedValue(null);

    await calculateOdds(raceId);

    const insertValues = (db.insert as unknown as Mock).mock.results[0].value.values;
    const valuesArg = insertValues.mock.calls[0][0];
    expect(valuesArg.winOdds).toEqual({ '1': 5.0, '2': 5.0 });
  });

  it('1馬番のみにベットが集中 → オッズ最低値1.1が適用される', async () => {
    (db.query.bets.findMany as unknown as Mock).mockResolvedValue([
      { amount: 1000, details: { type: 'win', selections: [1] } },
    ]);
    (redis.get as unknown as Mock).mockResolvedValue(null);

    await calculateOdds(raceId);

    const insertValues = (db.insert as unknown as Mock).mock.results[0].value.values;
    const valuesArg = insertValues.mock.calls[0][0];
    expect(valuesArg.winOdds['1']).toBe(1.1);
  });

  describe('スロットリング', () => {
    it('スロットルされていない場合はSSEイベントを即時発火してRedisにスロットルキーをセットする', async () => {
      (db.query.bets.findMany as unknown as Mock).mockResolvedValue([]);
      (redis.get as unknown as Mock).mockResolvedValue(null);

      await calculateOdds(raceId);

      expect(raceEventEmitter.emit).toHaveBeenCalledWith('RACE_ODDS_UPDATED', expect.objectContaining({ raceId }));
      expect(redis.set).toHaveBeenCalledWith(`race:${raceId}:last_odds_notification`, 'true', 'EX', 10);
    });

    it('スロットル中はSSEイベントを即時発火せずtrailing-edge更新をスケジュールする', async () => {
      (db.query.bets.findMany as unknown as Mock).mockResolvedValue([]);
      (redis.get as unknown as Mock).mockResolvedValue('true');
      (redis.ttl as unknown as Mock).mockResolvedValue(5);
      (redis.set as unknown as Mock).mockResolvedValue('OK');

      await calculateOdds(raceId);

      expect(raceEventEmitter.emit).not.toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalledWith(`race:${raceId}:update_scheduled`, 'true', 'EX', 6, 'NX');
    });

    it('NX=null で既にスケジュール済みの場合は重複スケジュールしない', async () => {
      (db.query.bets.findMany as unknown as Mock).mockResolvedValue([]);
      (redis.get as unknown as Mock).mockResolvedValue('true');
      (redis.ttl as unknown as Mock).mockResolvedValue(5);
      (redis.set as unknown as Mock).mockResolvedValue(null);

      await calculateOdds(raceId);

      expect(raceEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('trailing-edge タイマー発火時に最新オッズを取得してSSEを発火し、スケジュールキーを削除する', async () => {
      const latestOdds = {
        winOdds: { '1': 2.5, '2': 4.0 },
        placeOdds: {},
        updatedAt: new Date('2026-01-01'),
      };

      (db.query.bets.findMany as unknown as Mock).mockResolvedValue([]);
      (redis.get as unknown as Mock).mockResolvedValue('true');
      (redis.ttl as unknown as Mock).mockResolvedValue(3);
      (redis.set as unknown as Mock).mockResolvedValue('OK');
      (db.query.raceOdds.findFirst as unknown as Mock).mockResolvedValue(latestOdds);

      await calculateOdds(raceId);
      await vi.advanceTimersByTimeAsync(3000);

      expect(raceEventEmitter.emit).toHaveBeenCalledWith(
        'RACE_ODDS_UPDATED',
        expect.objectContaining({
          raceId,
          data: expect.objectContaining({ winOdds: { '1': 2.5, '2': 4.0 } }),
        })
      );
      expect(redis.set).toHaveBeenCalledWith(`race:${raceId}:last_odds_notification`, 'true', 'EX', 10);
      expect(redis.del).toHaveBeenCalledWith(`race:${raceId}:update_scheduled`);
    });

    it('trailing-edge タイマーでオッズがnullの場合はSSEを発火しないがスケジュールキーは削除する', async () => {
      (db.query.bets.findMany as unknown as Mock).mockResolvedValue([]);
      (redis.get as unknown as Mock).mockResolvedValue('true');
      (redis.ttl as unknown as Mock).mockResolvedValue(2);
      (redis.set as unknown as Mock).mockResolvedValue('OK');
      (db.query.raceOdds.findFirst as unknown as Mock).mockResolvedValue(null);

      await calculateOdds(raceId);
      await vi.advanceTimersByTimeAsync(2000);

      expect(raceEventEmitter.emit).not.toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith(`race:${raceId}:update_scheduled`);
    });

    it('trailing-edge タイマーでDB例外が発生してもfinallyでスケジュールキーを削除する', async () => {
      (db.query.bets.findMany as unknown as Mock).mockResolvedValue([]);
      (redis.get as unknown as Mock).mockResolvedValue('true');
      (redis.ttl as unknown as Mock).mockResolvedValue(1);
      (redis.set as unknown as Mock).mockResolvedValue('OK');
      (db.query.raceOdds.findFirst as unknown as Mock).mockRejectedValue(new Error('DB error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await calculateOdds(raceId);
      await vi.advanceTimersByTimeAsync(1000);

      expect(redis.del).toHaveBeenCalledWith(`race:${raceId}:update_scheduled`);
      consoleSpy.mockRestore();
    });

    it('TTLが0以下の場合はdelay=0でsetTimeoutが発火される', async () => {
      (db.query.bets.findMany as unknown as Mock).mockResolvedValue([]);
      (redis.get as unknown as Mock).mockResolvedValue('true');
      (redis.ttl as unknown as Mock).mockResolvedValue(-1);
      (redis.set as unknown as Mock).mockResolvedValue('OK');
      (db.query.raceOdds.findFirst as unknown as Mock).mockResolvedValue({
        winOdds: { '3': 5.0 },
        placeOdds: {},
        updatedAt: new Date(),
      });

      await calculateOdds(raceId);
      await vi.advanceTimersByTimeAsync(0);

      expect(raceEventEmitter.emit).toHaveBeenCalled();
    });
  });
});

describe('calculateAllProvisionalOdds', () => {
  const raceId = 'race-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ベットタイプごとに暫定オッズを計算する', async () => {
    (db.query.bets.findMany as unknown as Mock).mockResolvedValue([
      { amount: 1000, details: { type: 'win', selections: [1] } },
      { amount: 500, details: { type: 'win', selections: [2] } },
    ]);
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue({
      guaranteedOdds: { win: 1.5 },
      fixedOddsMode: false,
    });
    (db.query.raceEntries.findMany as unknown as Mock).mockResolvedValue([]);

    const result = await calculateAllProvisionalOdds(raceId);

    expect(result.win).toBeDefined();
    expect(result.win[JSON.stringify([1])]).toBe(1.5);
    expect(result.win[JSON.stringify([2])]).toBe(3.0);
  });

  it('計算値が保証オッズを下回る場合は保証オッズが適用される', async () => {
    (db.query.bets.findMany as unknown as Mock).mockResolvedValue([
      { amount: 900, details: { type: 'win', selections: [1] } },
      { amount: 100, details: { type: 'win', selections: [2] } },
    ]);
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue({
      guaranteedOdds: { win: 2.0 },
      fixedOddsMode: false,
    });
    (db.query.raceEntries.findMany as unknown as Mock).mockResolvedValue([]);

    const result = await calculateAllProvisionalOdds(raceId);

    expect(result.win[JSON.stringify([1])]).toBe(2.0);
    expect(result.win[JSON.stringify([2])]).toBe(10.0);
  });

  it('レースが見つからない場合は保証オッズなしで計算される', async () => {
    (db.query.bets.findMany as unknown as Mock).mockResolvedValue([
      { amount: 1000, details: { type: 'win', selections: [1] } },
    ]);
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue(null);
    (db.query.raceEntries.findMany as unknown as Mock).mockResolvedValue([]);

    const result = await calculateAllProvisionalOdds(raceId);

    expect(result.win[JSON.stringify([1])]).toBe(1.1);
  });

  it('ベットがない場合は空のオブジェクトを返す', async () => {
    (db.query.bets.findMany as unknown as Mock).mockResolvedValue([]);
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue(null);
    (db.query.raceEntries.findMany as unknown as Mock).mockResolvedValue([]);

    const result = await calculateAllProvisionalOdds(raceId);

    expect(result).toEqual({});
  });

  it('馬連など順序非依存のベットはselections正規化後に集約される', async () => {
    (db.query.bets.findMany as unknown as Mock).mockResolvedValue([
      { amount: 500, details: { type: 'quinella', selections: [3, 1] } },
      { amount: 500, details: { type: 'quinella', selections: [1, 3] } },
    ]);
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue(null);
    (db.query.raceEntries.findMany as unknown as Mock).mockResolvedValue([]);

    const result = await calculateAllProvisionalOdds(raceId);

    expect(result.quinella[JSON.stringify([1, 3])]).toBe(1.1);
    expect(Object.keys(result.quinella)).toHaveLength(1);
  });

  it('馬単など順序依存のベットはselectionsそのままで集約される', async () => {
    (db.query.bets.findMany as unknown as Mock).mockResolvedValue([
      { amount: 500, details: { type: 'exacta', selections: [3, 1] } },
      { amount: 500, details: { type: 'exacta', selections: [1, 3] } },
    ]);
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue(null);
    (db.query.raceEntries.findMany as unknown as Mock).mockResolvedValue([]);

    const result = await calculateAllProvisionalOdds(raceId);

    expect(result.exacta[JSON.stringify([3, 1])]).toBe(2.0);
    expect(result.exacta[JSON.stringify([1, 3])]).toBe(2.0);
    expect(Object.keys(result.exacta)).toHaveLength(2);
  });

  it('fixedOddsModeの場合は空のオブジェクトを返す', async () => {
    (db.query.bets.findMany as unknown as Mock).mockResolvedValue([
      { amount: 1000, details: { type: 'win', selections: [1] } },
    ]);
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue({
      guaranteedOdds: null,
      fixedOddsMode: true,
    });
    (db.query.raceEntries.findMany as unknown as Mock).mockResolvedValue([]);

    const result = await calculateAllProvisionalOdds(raceId);

    expect(result).toEqual({});
  });
});

describe('getProvisionalOddsCached', () => {
  const raceId = 'race-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('キャッシュヒット時はDBを照会せずキャッシュ内容を返す', async () => {
    const cachedOdds = { win: { '[1]': 2.5 } };
    (redis.get as unknown as Mock).mockResolvedValue(JSON.stringify(cachedOdds));

    const result = await getProvisionalOddsCached(raceId);

    expect(result).toEqual(cachedOdds);
    expect(db.query.bets.findMany).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('キャッシュミス時は計算結果をTTL付きで保存して返す', async () => {
    (redis.get as unknown as Mock).mockResolvedValue(null);
    (db.query.bets.findMany as unknown as Mock).mockResolvedValue([
      { amount: 1000, details: { type: 'win', selections: [1] } },
    ]);
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue(null);
    (db.query.raceEntries.findMany as unknown as Mock).mockResolvedValue([]);

    const result = await getProvisionalOddsCached(raceId);

    expect(result.win[JSON.stringify([1])]).toBe(1.1);
    expect(redis.set).toHaveBeenCalledWith(`race:${raceId}:provisional_odds`, JSON.stringify(result), 'EX', 10);
  });

  it('Redis障害時はキャッシュを素通りして計算結果を返す', async () => {
    (redis.get as unknown as Mock).mockRejectedValue(new Error('redis down'));
    (redis.set as unknown as Mock).mockRejectedValue(new Error('redis down'));
    (db.query.bets.findMany as unknown as Mock).mockResolvedValue([
      { amount: 1000, details: { type: 'win', selections: [1] } },
    ]);
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue(null);
    (db.query.raceEntries.findMany as unknown as Mock).mockResolvedValue([]);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await getProvisionalOddsCached(raceId);
    consoleSpy.mockRestore();

    expect(result.win[JSON.stringify([1])]).toBe(1.1);
  });
});

describe('getRaceOdds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('指定レースのオッズを取得する', async () => {
    const mockOdds = { raceId: 'race-1', winOdds: { '1': 2.0 }, placeOdds: {} };
    (db.query.raceOdds.findFirst as unknown as Mock).mockResolvedValue(mockOdds);

    const result = await getRaceOdds('race-1');

    expect(result).toEqual(mockOdds);
  });

  it('オッズが存在しない場合はundefinedを返す', async () => {
    (db.query.raceOdds.findFirst as unknown as Mock).mockResolvedValue(undefined);

    const result = await getRaceOdds('nonexistent');

    expect(result).toBeUndefined();
  });
});
