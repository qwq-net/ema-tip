import { db } from '@/shared/db';
import { ADMIN_ERRORS } from '@/shared/utils/admin';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { getUsers } from './queries';

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
      users: { findMany: vi.fn().mockResolvedValue([]) },
    },
  },
}));

describe('getUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('管理者以外を拒否すること', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockRejectedValue(new Error(ADMIN_ERRORS.UNAUTHORIZED));

    await expect(getUsers()).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });

  it('パスワードやトークンなどの機微カラムを取得しないこと', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });

    await getUsers();

    const args = (db.query.users.findMany as unknown as Mock).mock.calls[0][0];
    expect(args.columns).toBeDefined();
    expect(args.columns.password).toBeUndefined();
    expect(args.with.accounts.columns).toEqual({ provider: true });
  });
});
