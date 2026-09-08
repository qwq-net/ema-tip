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

// 収支と取引ログの検証で共通に使うウォレット 1 件を積む
function mockSingleWallet() {
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
}

describe('getGlobalStats のイベント別収支', () => {
  it('ランキングと同じく所持金から借入と配布金額を引いた値にする', async () => {
    mockSingleWallet();

    const stats = await getGlobalStats();

    expect(stats.events[0]?.net).toBe(120000 - 50000 - 100000);
  });
});

describe('getGlobalStats の取引ログの説明文', () => {
  it('ウォレットと同じ describeTransaction の文言を使い、辿れない関連は取引種別の表示名にする', async () => {
    mockSingleWallet();
    vi.mocked(db.query.transactions.findMany).mockResolvedValue([
      {
        id: 'tx-1',
        type: 'BET',
        amount: -1000,
        createdAt: new Date('2026-09-01T01:00:00Z'),
        wallet: { eventId: 'event-1' },
        bet: { id: 'bet-1', race: { name: '新馬戦', venue: { shortName: '東京' } } },
        event: null,
        bet5Ticket: null,
      },
      {
        id: 'tx-2',
        type: 'BET',
        amount: -500,
        createdAt: new Date('2026-09-01T02:00:00Z'),
        wallet: { eventId: 'event-1' },
        bet: null,
        event: null,
        bet5Ticket: null,
      },
    ] as never);

    const stats = await getGlobalStats();

    // ログは新しい順に並べ替えられるため、2 件目が先頭に来る
    expect(stats.events[0]?.logs.map((log) => log.description)).toEqual(['購入', '東京 新馬戦']);
  });
});
