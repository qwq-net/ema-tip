import { db } from '@/shared/db';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteUser, toggleUserStatus, updateUserRole } from './actions';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } }),
  };
});

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/shared/db', () => ({
  db: {
    update: vi.fn(),
    delete: vi.fn(),
    query: { users: { findFirst: vi.fn() } },
  },
}));

describe('updateUserRole', () => {
  const setWhere = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where: setWhere });

  beforeEach(() => {
    vi.clearAllMocks();
    set.mockReturnValue({ where: setWhere });
    (db.update as unknown as Mock).mockReturnValue({ set });
  });

  it('自分自身の管理者権限は変更せず、理由をエラーとして返す', async () => {
    const result = await updateUserRole('admin-1', 'USER');

    expect(result).toEqual({ success: false, error: '自身の管理者権限は変更できません' });
    expect(db.update).not.toHaveBeenCalled();
  });

  it('他のユーザーの役割は更新して成功を返す', async () => {
    const result = await updateUserRole('user-2', 'ADMIN');

    expect(result.success).toBe(true);
    expect(set).toHaveBeenCalledWith({ role: 'ADMIN' });
  });
});

describe('toggleUserStatus', () => {
  const setWhere = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    set.mockReturnValue({ where: setWhere });
    (db.update as unknown as Mock).mockReturnValue({ set });
  });

  it('自身のアカウントは無効化せず、理由をエラーとして返す', async () => {
    const result = await toggleUserStatus('admin-1');

    expect(result).toEqual({ success: false, error: '自身のアカウントは無効化できません' });
    expect(db.update).not.toHaveBeenCalled();
  });

  it('ユーザーが無ければ理由をエラーとして返す', async () => {
    (db.query.users.findFirst as unknown as Mock).mockResolvedValue(undefined);

    const result = await toggleUserStatus('missing');

    expect(result).toEqual({ success: false, error: 'ユーザーが見つかりません' });
    expect(db.update).not.toHaveBeenCalled();
  });

  it('有効なユーザーは無効化し、無効なユーザーは有効化して成功を返す', async () => {
    (db.query.users.findFirst as unknown as Mock).mockResolvedValue({ id: 'user-2', disabledAt: null });
    const enabled = await toggleUserStatus('user-2');
    expect(enabled.success).toBe(true);
    expect(set).toHaveBeenCalledWith({ disabledAt: expect.any(Date) });

    (db.query.users.findFirst as unknown as Mock).mockResolvedValue({ id: 'user-2', disabledAt: new Date() });
    const disabled = await toggleUserStatus('user-2');
    expect(disabled.success).toBe(true);
    expect(set).toHaveBeenLastCalledWith({ disabledAt: null });
  });
});

describe('deleteUser', () => {
  const deleteWhere = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    (db.delete as unknown as Mock).mockReturnValue({ where: deleteWhere });
  });

  it('自身のアカウントは削除せず、理由をエラーとして返す', async () => {
    const result = await deleteUser('admin-1');

    expect(result).toEqual({ success: false, error: '自身のアカウントは削除できません' });
    expect(db.delete).not.toHaveBeenCalled();
  });

  it('他のユーザーは削除して成功を返す', async () => {
    const result = await deleteUser('user-2');

    expect(result.success).toBe(true);
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});
