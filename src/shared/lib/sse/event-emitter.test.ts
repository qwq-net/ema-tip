import { beforeEach, describe, expect, it, vi } from 'vitest';

// vitest.setup.ts は emit をモックに差し替えるが、ここでは実物の配信経路を検証する
vi.unmock('@/shared/lib/sse/event-emitter');

const { redis, subscriber, subscriberHandlers } = vi.hoisted(() => {
  const subscriberHandlers: Record<string, (...args: string[]) => void> = {};
  const subscriber = {
    on: vi.fn((event: string, handler: (...args: string[]) => void) => {
      subscriberHandlers[event] = handler;
      return subscriber;
    }),
    subscribe: vi.fn(() => Promise.resolve(1)),
  };
  const redis = {
    publish: vi.fn(() => Promise.resolve(1)),
    duplicate: vi.fn(() => subscriber),
  };
  return { redis, subscriber, subscriberHandlers };
});

vi.mock('@/shared/lib/redis', () => ({ redis }));

import { RACE_EVENTS, raceEventEmitter } from './event-emitter';

describe('raceEventEmitter', () => {
  // duplicate の呼び出し回数はファイル全体で 1 回であることを確かめたいので消さない
  beforeEach(() => {
    redis.publish.mockClear();
    subscriber.subscribe.mockClear();
    raceEventEmitter.removeAllListeners();
  });

  it('emit は Redis へ publish し、ローカルのリスナーを同期では呼ばない', () => {
    const listener = vi.fn();
    raceEventEmitter.on(RACE_EVENTS.RACE_CLOSED, listener);

    raceEventEmitter.emit(RACE_EVENTS.RACE_CLOSED, { raceId: 'r1', timestamp: 1 });

    expect(redis.publish).toHaveBeenCalledWith(
      'race-events',
      JSON.stringify({ type: 'RACE_CLOSED', payload: { raceId: 'r1', timestamp: 1 } })
    );
    expect(listener).not.toHaveBeenCalled();
  });

  it('購読接続は初回の on で 1 本だけ作り、ready のたびに購読する', () => {
    raceEventEmitter.on(RACE_EVENTS.RACE_CLOSED, vi.fn());
    raceEventEmitter.on(RACE_EVENTS.RACE_REOPENED, vi.fn());

    expect(redis.duplicate).toHaveBeenCalledTimes(1);
    expect(subscriber.subscribe).not.toHaveBeenCalled();

    subscriberHandlers.ready?.();
    subscriberHandlers.ready?.();
    expect(subscriber.subscribe).toHaveBeenCalledTimes(2);
    expect(subscriber.subscribe).toHaveBeenCalledWith('race-events');
  });

  it('message を受けると同じ種別のリスナーへ payload を配る。Date は文字列になる', () => {
    const listener = vi.fn();
    raceEventEmitter.on(RACE_EVENTS.RACE_ODDS_UPDATED, listener);
    const updatedAt = new Date('2026-09-05T00:00:00.000Z');

    subscriberHandlers.message?.(
      'race-events',
      JSON.stringify({
        type: 'RACE_ODDS_UPDATED',
        payload: { raceId: 'r1', data: { winOdds: { '1': 2.5 }, placeOdds: {}, updatedAt } },
      })
    );

    expect(listener).toHaveBeenCalledWith({
      raceId: 'r1',
      data: { winOdds: { '1': 2.5 }, placeOdds: {}, updatedAt: '2026-09-05T00:00:00.000Z' },
    });
  });
});
