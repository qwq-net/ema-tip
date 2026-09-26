import { db } from '@/shared/db';
import { expect, it, vi } from 'vitest';
import { getSokubetDashboardData } from './sokubet';

vi.mock('@/shared/db', () => ({
  db: {
    query: {
      events: { findMany: vi.fn() },
      wallets: { findMany: vi.fn() },
      raceInstances: { findMany: vi.fn() },
      bet5Events: { findMany: vi.fn() },
      bet5Tickets: { findMany: vi.fn() },
    },
    select: vi.fn(),
  },
}));

it('開催済みイベントも即BETに表示し、レースが空でも履歴から落とさない', async () => {
  vi.mocked(db.query.events.findMany).mockResolvedValue([
    { id: 'old', status: 'COMPLETED', date: '2026-09-01' },
    { id: 'current', status: 'ACTIVE', date: '2026-09-27' },
  ] as never);
  vi.mocked(db.query.wallets.findMany).mockResolvedValue([]);
  vi.mocked(db.query.raceInstances.findMany).mockResolvedValue([]);
  vi.mocked(db.query.bet5Events.findMany).mockResolvedValue([]);
  vi.mocked(db.select).mockReturnValue({
    from: () => ({ innerJoin: () => ({ where: () => ({ groupBy: () => Promise.resolve([]) }) }) }),
  } as never);

  const groups = await getSokubetDashboardData('user-1');
  expect(groups.map((group) => group.event.status)).toEqual(['ACTIVE', 'COMPLETED']);
  expect(groups[1]?.races).toEqual([]);
});
