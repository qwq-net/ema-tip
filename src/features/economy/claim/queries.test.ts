import { db } from '@/shared/db';
import { expect, it, vi } from 'vitest';
import { getEventsWithJoinStatus } from './queries';

vi.mock('@/shared/db', () => ({
  db: { query: { events: { findMany: vi.fn() }, wallets: { findMany: vi.fn() } } },
}));

it('開催済みイベントを参加履歴として返す', async () => {
  vi.mocked(db.query.events.findMany).mockResolvedValue([{ id: 'event-1', status: 'COMPLETED' }] as never);
  vi.mocked(db.query.wallets.findMany).mockResolvedValue([{ eventId: 'event-1' }] as never);

  const result = await getEventsWithJoinStatus('user-1');
  expect(result).toEqual([{ id: 'event-1', status: 'COMPLETED', isJoined: true }]);
});
