import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/utils/admin', () => ({
  requireUser: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}));

vi.mock('@/shared/db', () => ({
  db: {
    query: {
      wallets: { findMany: vi.fn() },
      transactions: { findMany: vi.fn() },
    },
  },
}));

import { db } from '@/shared/db';
import { getGlobalStats } from './actions';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.query.transactions.findMany).mockResolvedValue([]);
});

describe('getGlobalStats のイベント別収支', () => {
  it('ランキングと同じく所持金から借入と配布金額を引いた値にする', async () => {
    vi.mocked(db.query.wallets.findMany).mockResolvedValue([
      {
        id: 'wallet-1',
        eventId: 'event-1',
        userId: 'user-1',
        balance: 120000,
        totalLoaned: 50000,
        createdAt: new Date('2026-09-01T00:00:00Z'),
        event: { id: 'event-1', name: '秋の開催', distributeAmount: 100000 },
      },
    ] as never);

    const stats = await getGlobalStats();

    expect(stats.events[0]?.net).toBe(120000 - 50000 - 100000);
  });
});
