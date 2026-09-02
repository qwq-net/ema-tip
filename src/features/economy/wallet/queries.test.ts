import { db } from '@/shared/db';
import { ADMIN_ERRORS } from '@/shared/utils/admin';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEventWallets, getWalletTransactions } from './queries';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireUser: vi.fn(),
  };
});

vi.mock('@/shared/db', () => ({
  db: {
    query: {
      wallets: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      transactions: {
        findMany: vi.fn(),
      },
    },
  },
}));

describe('getEventWallets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未ログインの場合はエラーをスローすること', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockRejectedValue(new Error(ADMIN_ERRORS.UNAUTHORIZED));

    await expect(getEventWallets()).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });

  it('ログイン中ユーザー自身のウォレットのみ取得すること', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (db.query.wallets.findMany as unknown as Mock).mockResolvedValue([{ id: 'w1' }]);

    const result = await getEventWallets();

    expect(result).toEqual([{ id: 'w1' }]);
    expect(db.query.wallets.findMany).toHaveBeenCalled();
  });
});

describe('getWalletTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未ログインの場合はエラーをスローすること', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockRejectedValue(new Error(ADMIN_ERRORS.UNAUTHORIZED));

    await expect(getWalletTransactions('wallet-1')).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });

  it('他人のウォレットIDを指定した場合はエラーをスローすること', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (db.query.wallets.findFirst as unknown as Mock).mockResolvedValue({ id: 'wallet-1', userId: 'other-user' });

    await expect(getWalletTransactions('wallet-1')).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
    expect(db.query.transactions.findMany).not.toHaveBeenCalled();
  });

  it('存在しないウォレットIDの場合はエラーをスローすること', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (db.query.wallets.findFirst as unknown as Mock).mockResolvedValue(undefined);

    await expect(getWalletTransactions('wallet-x')).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });

  it('自分のウォレットの場合は取引履歴を返すこと', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (db.query.wallets.findFirst as unknown as Mock).mockResolvedValue({ id: 'wallet-1', userId: 'user-1' });
    (db.query.transactions.findMany as unknown as Mock).mockResolvedValue([{ id: 't1' }]);

    const result = await getWalletTransactions('wallet-1');

    expect(result).toEqual([{ id: 't1' }]);
  });
});
