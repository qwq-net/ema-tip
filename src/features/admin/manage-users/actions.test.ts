import { db } from '@/shared/db';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateUserRole } from './actions';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } }),
  };
});

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/shared/db', () => ({
  db: { update: vi.fn() },
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
