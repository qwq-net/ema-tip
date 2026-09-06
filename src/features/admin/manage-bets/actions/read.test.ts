import { ADMIN_ERRORS } from '@/shared/utils/admin';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseBetGroupListParams } from '../lib/list-params';
import { getRaceBetGroupPage, getRaceBetOverview, getRaceBetSummaries } from './read';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn(),
  };
});

// select() から続く連鎖をどの順で呼んでも同じオブジェクトを返し、await した時点で用意した行を返す
const { chain, setRows } = vi.hoisted(() => {
  let rows: unknown[] = [];
  const chain: Record<string, unknown> = {};
  for (const method of ['from', 'innerJoin', 'where', 'groupBy', 'orderBy', 'limit', 'offset', 'as']) {
    chain[method] = () => chain;
  }
  chain.then = (resolve: (value: unknown[]) => void) => resolve(rows);
  return {
    chain,
    setRows: (next: unknown[]) => {
      rows = next;
    },
  };
});
vi.mock('@/shared/db', () => ({
  db: { select: () => chain },
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

  it('getRaceBetOverview は管理者以外を拒否すること', async () => {
    await expect(getRaceBetOverview('race-1')).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });

  it('getRaceBetGroupPage は管理者以外を拒否すること', async () => {
    await expect(getRaceBetGroupPage('race-1', parseBetGroupListParams({}))).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });
});

describe('getRaceBetSummaries', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
  });

  it('集計行を raceId キーの Map にし、DB が文字列で返す合計を数値へ直すこと', async () => {
    setRows([
      { raceId: 'race-1', betCount: 3, totalAmount: '1500', totalPayout: '2400' },
      { raceId: 'race-2', betCount: 1, totalAmount: '100', totalPayout: '0' },
    ]);

    const result = await getRaceBetSummaries('event-1');

    expect(result.get('race-1')).toEqual({ betCount: 3, totalAmount: 1500, totalPayout: 2400 });
    expect(result.get('race-2')).toEqual({ betCount: 1, totalAmount: 100, totalPayout: 0 });
    expect(result.has('race-3')).toBe(false);
  });
});
