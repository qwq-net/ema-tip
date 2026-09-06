import { ADMIN_ERRORS } from '@/shared/utils/admin';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBetsByRace, getRaceBetSummaries } from './read';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn(),
  };
});

// select().from().innerJoin().where().groupBy() の連鎖を 1 つのオブジェクトで受け、末端だけ差し替える
const { mockGroupBy, selectChain } = vi.hoisted(() => {
  const mockGroupBy = vi.fn();
  const selectChain = {
    from: () => selectChain,
    innerJoin: () => selectChain,
    where: () => selectChain,
    groupBy: mockGroupBy,
  };
  return { mockGroupBy, selectChain };
});
vi.mock('@/shared/db', () => ({
  db: {
    select: () => selectChain,
    query: {
      bets: { findMany: vi.fn().mockResolvedValue([]) },
    },
  },
}));

describe('manage-bets read actions の認可', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockRejectedValue(new Error(ADMIN_ERRORS.UNAUTHORIZED));
  });

  it('getRaceBetSummaries は管理者以外を拒否すること', async () => {
    await expect(getRaceBetSummaries('event-1')).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });

  it('getBetsByRace は管理者以外を拒否すること', async () => {
    await expect(getBetsByRace('race-1')).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });
});

describe('getRaceBetSummaries', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
  });

  it('集計行を raceId キーの Map にし、DB が文字列で返す合計を数値へ直すこと', async () => {
    mockGroupBy.mockResolvedValue([
      { raceId: 'race-1', betCount: 3, totalAmount: '1500', totalPayout: '2400' },
      { raceId: 'race-2', betCount: 1, totalAmount: '100', totalPayout: '0' },
    ]);

    const result = await getRaceBetSummaries('event-1');

    expect(result.get('race-1')).toEqual({ betCount: 3, totalAmount: 1500, totalPayout: 2400 });
    expect(result.get('race-2')).toEqual({ betCount: 1, totalAmount: 100, totalPayout: 0 });
    expect(result.has('race-3')).toBe(false);
  });
});
