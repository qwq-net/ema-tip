import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/redis', () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn(), incr: vi.fn(), expire: vi.fn() },
}));

import { redis } from '@/shared/lib/redis';
import { clearLoginFailures, recordLoginFailure } from './login-rate-limit';

const ip = '203.0.113.5';
const counterKey = `ratelimit:ip:${ip}:attempts`;
const recordKey = `ratelimit:ip:${ip}`;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('recordLoginFailure', () => {
  it('失敗回数は Redis の INCR で数え、読んで足して書く方式にしない', async () => {
    vi.mocked(redis.incr).mockResolvedValue(1);

    await recordLoginFailure(ip, null);

    expect(redis.incr).toHaveBeenCalledWith(counterKey);
    expect(redis.expire).toHaveBeenCalledWith(counterKey, 24 * 60 * 60);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('INCR の戻り値がしきい値に達したらロックを掛けて回数キーを消す', async () => {
    vi.mocked(redis.incr).mockResolvedValue(5);

    await recordLoginFailure(ip, null);

    expect(redis.set).toHaveBeenCalledTimes(1);
    const call = vi.mocked(redis.set).mock.calls[0];
    expect(call?.[0]).toBe(recordKey);
    const saved = JSON.parse(String(call?.[1])) as { blockLevel: number; lockedUntil: number };
    expect(saved.blockLevel).toBe(1);
    expect(saved.lockedUntil).toBeGreaterThan(Date.now());
    expect(redis.del).toHaveBeenCalledWith(counterKey);
  });

  it('一度ロックされた IP の総当たり疑いの失敗は 1 回で再ロックする', async () => {
    vi.mocked(redis.incr).mockResolvedValue(1);

    await recordLoginFailure(ip, { blockLevel: 1, lockedUntil: null, lastAttemptAt: 0 }, true);

    expect(redis.set).toHaveBeenCalledTimes(1);
  });
});

describe('clearLoginFailures', () => {
  it('ロック記録と回数キーの両方を消す', async () => {
    await clearLoginFailures(ip);

    expect(redis.del).toHaveBeenCalledWith(recordKey, counterKey);
  });
});
