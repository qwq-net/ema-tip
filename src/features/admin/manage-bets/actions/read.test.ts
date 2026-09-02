import { ADMIN_ERRORS } from '@/shared/utils/admin';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBetsByRace, getEventsWithRaces, getRaceWithBets } from './read';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn(),
  };
});

vi.mock('@/shared/db', () => ({
  db: {
    query: {
      events: { findMany: vi.fn().mockResolvedValue([]) },
      bets: { findMany: vi.fn().mockResolvedValue([]) },
      raceInstances: { findFirst: vi.fn().mockResolvedValue(undefined) },
    },
  },
}));

describe('manage-bets read actions の認可', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockRejectedValue(new Error(ADMIN_ERRORS.UNAUTHORIZED));
  });

  it('getEventsWithRaces は管理者以外を拒否すること', async () => {
    await expect(getEventsWithRaces()).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });

  it('getBetsByRace は管理者以外を拒否すること', async () => {
    await expect(getBetsByRace('race-1')).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });

  it('getRaceWithBets は管理者以外を拒否すること', async () => {
    await expect(getRaceWithBets('race-1')).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });
});
