import { db } from '@/shared/db';
import { logAdminAction } from '@/shared/utils/admin-audit';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteUser, toggleUserStatus, updateUserRole } from './actions';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin-1', name: '管理者', role: 'ADMIN' } }),
  };
});

vi.mock('@/shared/utils/admin-audit', () => ({ logAdminAction: vi.fn().mockResolvedValue(undefined) }));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/shared/db', () => ({
  db: { transaction: vi.fn() },
}));

// 3 つの操作はいずれも本体とログを同一トランザクションで行うため、tx をまとめて用意する
function createTx() {
  return {
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
    query: { users: { findFirst: vi.fn() } },
  };
}

describe('updateUserRole', () => {
  const setWhere = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where: setWhere });
  let tx = createTx();

  beforeEach(() => {
    vi.clearAllMocks();
    tx = createTx();
    set.mockReturnValue({ where: setWhere });
    tx.update.mockReturnValue({ set });
    tx.query.users.findFirst.mockResolvedValue({ name: 'ルメール', role: 'USER' });
    (db.transaction as unknown as Mock).mockImplementation((fn: (t: typeof tx) => Promise<void>) => fn(tx));
  });

  it('自分自身の管理者権限は変更せず、理由をエラーとして返す', async () => {
    const result = await updateUserRole('admin-1', 'USER');

    expect(result).toEqual({ success: false, error: '自身の管理者権限は変更できません' });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('他のユーザーの役割は更新して成功を返す', async () => {
    const result = await updateUserRole('user-2', 'ADMIN');

    expect(result.success).toBe(true);
    expect(set).toHaveBeenCalledWith({ role: 'ADMIN' });
  });

  it('役割の変更を誰が何から何へ変えたかまで監査ログに残す', async () => {
    await updateUserRole('user-2', 'ADMIN');

    expect(logAdminAction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ id: 'admin-1' }),
      expect.objectContaining({
        action: 'user.change_role',
        targetId: 'user-2',
        detail: expect.objectContaining({ from: 'USER', to: 'ADMIN' }),
      })
    );
  });

  it('同じ役割への変更は何もせず監査ログも残さない', async () => {
    tx.query.users.findFirst.mockResolvedValue({ name: 'ルメール', role: 'ADMIN' });

    const result = await updateUserRole('user-2', 'ADMIN');

    expect(result.success).toBe(true);
    expect(tx.update).not.toHaveBeenCalled();
    expect(logAdminAction).not.toHaveBeenCalled();
  });
});

describe('toggleUserStatus', () => {
  const setWhere = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn();
  let tx = createTx();

  beforeEach(() => {
    vi.clearAllMocks();
    tx = createTx();
    set.mockReturnValue({ where: setWhere });
    tx.update.mockReturnValue({ set });
    (db.transaction as unknown as Mock).mockImplementation((fn: (t: typeof tx) => Promise<void>) => fn(tx));
  });

  it('自身のアカウントは無効化せず、理由をエラーとして返す', async () => {
    const result = await toggleUserStatus('admin-1');

    expect(result).toEqual({ success: false, error: '自身のアカウントは無効化できません' });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('ユーザーが無ければ理由をエラーとして返す', async () => {
    tx.query.users.findFirst.mockResolvedValue(undefined);

    const result = await toggleUserStatus('missing');

    expect(result).toEqual({ success: false, error: 'ユーザーが見つかりません' });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('有効なユーザーは無効化し、無効なユーザーは有効化して成功を返す', async () => {
    tx.query.users.findFirst.mockResolvedValue({ id: 'user-2', disabledAt: null });
    const enabled = await toggleUserStatus('user-2');
    expect(enabled.success).toBe(true);
    expect(set).toHaveBeenCalledWith({ disabledAt: expect.any(Date) });

    tx.query.users.findFirst.mockResolvedValue({ id: 'user-2', disabledAt: new Date() });
    const disabled = await toggleUserStatus('user-2');
    expect(disabled.success).toBe(true);
    expect(set).toHaveBeenLastCalledWith({ disabledAt: null });
  });

  it('凍結と解除を区別して監査ログに残す', async () => {
    tx.query.users.findFirst.mockResolvedValue({
      id: 'user-2',
      name: 'ルメール',
      disabledAt: null,
    });
    await toggleUserStatus('user-2');
    expect(logAdminAction).toHaveBeenLastCalledWith(
      tx,
      expect.anything(),
      expect.objectContaining({ action: 'user.disable', targetId: 'user-2' })
    );

    tx.query.users.findFirst.mockResolvedValue({
      id: 'user-2',
      name: 'ルメール',
      disabledAt: new Date(),
    });
    await toggleUserStatus('user-2');
    expect(logAdminAction).toHaveBeenLastCalledWith(
      tx,
      expect.anything(),
      expect.objectContaining({ action: 'user.enable', targetId: 'user-2' })
    );
  });
});

describe('deleteUser', () => {
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const tx = {
    delete: vi.fn(),
    select: vi.fn(),
    query: { users: { findFirst: vi.fn() } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tx.delete.mockReturnValue({ where: deleteWhere });
    tx.query.users.findFirst.mockResolvedValue({ name: 'ルメール', role: 'USER' });
    // 1 回目の select がウォレット、2 回目がベット
    // 1 回目がウォレット、2 回目がベット、3 回目が発行したゲストコード
    tx.select
      .mockReturnValueOnce({
        from: () => ({ where: () => Promise.resolve([{ eventId: 'ev-1', balance: 12000, totalLoaned: 5000 }]) }),
      })
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ id: 'bet-1' }, { id: 'bet-2' }]) }) })
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ code: 'WELCOME1' }]) }) });
    (db.transaction as unknown as Mock).mockImplementation((fn: (t: typeof tx) => Promise<void>) => fn(tx));
  });

  it('自身のアカウントは削除せず、理由をエラーとして返す', async () => {
    const result = await deleteUser('admin-1');

    expect(result).toEqual({ success: false, error: '自身のアカウントは削除できません' });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('他のユーザーは削除して成功を返す', async () => {
    const result = await deleteUser('user-2');

    expect(result.success).toBe(true);
    expect(tx.delete).toHaveBeenCalledTimes(1);
  });

  it('連鎖削除で消える残高とベット件数を、削除前に監査ログへ焼き付ける', async () => {
    await deleteUser('user-2');

    expect(logAdminAction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ id: 'admin-1' }),
      expect.objectContaining({
        action: 'user.delete',
        targetId: 'user-2',
        detail: expect.objectContaining({
          userName: 'ルメール',
          walletCount: 1,
          totalBalance: 12000,
          totalLoaned: 5000,
          betCount: 2,
          wallets: ['ev-1:12000:5000'],
          issuedGuestCodes: ['WELCOME1'],
        }),
      })
    );
  });

  it('存在しないユーザーは削除せず理由をエラーとして返す', async () => {
    tx.query.users.findFirst.mockResolvedValue(undefined);

    const result = await deleteUser('missing');

    expect(result).toEqual({ success: false, error: 'ユーザーが見つかりません' });
    expect(tx.delete).not.toHaveBeenCalled();
  });
});
