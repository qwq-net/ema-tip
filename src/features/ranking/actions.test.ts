import { db } from '@/shared/db';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEventRanking } from './actions';

vi.mock('@/shared/db', () => ({
  db: {
    query: {
      events: { findFirst: vi.fn() },
      wallets: { findMany: vi.fn() },
    },
    update: vi.fn(),
  },
}));

const makeWallet = (userId: string, balance: number, createdAt: Date, totalLoaned = 0) => ({
  userId,
  balance,
  totalLoaned,
  createdAt,
  user: { id: userId, name: `name-${userId}` },
});

describe('getEventRanking の表示モード別マスク', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { auth } = await import('@/shared/config/auth');
    (auth as unknown as Mock).mockResolvedValue({ user: { id: 'user-b' } });

    // 残高降順で返るDBの並び: b(3000) > a(2000) > c(1000) で現在ユーザーbが先頭
    // 作成順は c → a → b で、作成順に並べ直すとbは末尾になる
    (db.query.wallets.findMany as unknown as Mock).mockResolvedValue([
      makeWallet('user-b', 3000, new Date('2026-01-03')),
      makeWallet('user-a', 2000, new Date('2026-01-02')),
      makeWallet('user-c', 1000, new Date('2026-01-01')),
    ]);
  });

  it('HIDDEN では返却順から実際の順位が漏れないこと', async () => {
    (db.query.events.findFirst as unknown as Mock).mockResolvedValue({
      id: 'event-1',
      distributeAmount: 10000,
      rankingDisplayMode: 'HIDDEN',
    });

    const result = await getEventRanking('event-1');

    const order = result.ranking.map((r) => r.isCurrentUser);
    expect(order).not.toEqual([true, false, false]);
  });

  it('HIDDEN では userId が実IDとして返らないこと', async () => {
    (db.query.events.findFirst as unknown as Mock).mockResolvedValue({
      id: 'event-1',
      distributeAmount: 10000,
      rankingDisplayMode: 'HIDDEN',
    });

    const result = await getEventRanking('event-1');

    for (const row of result.ranking) {
      expect(['user-a', 'user-b', 'user-c']).not.toContain(row.userId);
    }
  });

  it('ANONYMOUS では他人の userId が実IDとして返らないこと', async () => {
    (db.query.events.findFirst as unknown as Mock).mockResolvedValue({
      id: 'event-1',
      distributeAmount: 10000,
      rankingDisplayMode: 'ANONYMOUS',
    });

    const result = await getEventRanking('event-1');

    const others = result.ranking.filter((r) => !r.isCurrentUser);
    for (const row of others) {
      expect(['user-a', 'user-c']).not.toContain(row.userId);
    }

    const self = result.ranking.find((r) => r.isCurrentUser);
    expect(self?.name).toBe('name-user-b');
  });

  it('FULL では userId と名前がそのまま返ること', async () => {
    (db.query.events.findFirst as unknown as Mock).mockResolvedValue({
      id: 'event-1',
      distributeAmount: 10000,
      rankingDisplayMode: 'FULL',
    });

    const result = await getEventRanking('event-1');

    expect(result.ranking.map((r) => r.userId)).toEqual(['user-b', 'user-a', 'user-c']);
    expect(result.ranking.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('FULL_WITH_LOAN では借入を差し引いた純資産で順位を付け、所持金と借入額はそのまま返すこと', async () => {
    (db.query.events.findFirst as unknown as Mock).mockResolvedValue({
      id: 'event-1',
      distributeAmount: 10000,
      rankingDisplayMode: 'FULL_WITH_LOAN',
    });
    (db.query.wallets.findMany as unknown as Mock).mockResolvedValue([
      makeWallet('user-c', 1000, new Date('2026-01-01')),
      makeWallet('user-a', 2000, new Date('2026-01-02'), 1500),
      makeWallet('user-b', 3000, new Date('2026-01-03')),
    ]);

    const result = await getEventRanking('event-1');

    expect(result.ranking.map((r) => [r.userId, r.rank, r.balance, r.totalLoaned])).toEqual([
      ['user-b', 1, 3000, undefined],
      ['user-c', 2, 1000, undefined],
      ['user-a', 3, 2000, 1500],
    ]);
  });
});
