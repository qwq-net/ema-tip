import { db } from '@/shared/db';
import { logAdminAction } from '@/shared/utils/admin-audit';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addAdminDiscordId, removeAdminDiscordId } from './actions';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } }),
  };
});

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/shared/utils/admin-audit', () => ({ logAdminAction: vi.fn().mockResolvedValue(undefined) }));

vi.mock('@/shared/db', () => ({
  db: {
    transaction: vi.fn(),
    query: { adminDiscordIds: { findFirst: vi.fn() } },
  },
}));

describe('addAdminDiscordId', () => {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values });
  const tx = { insert };

  beforeEach(() => {
    vi.clearAllMocks();
    insert.mockReturnValue({ values });
    (db.transaction as unknown as Mock).mockImplementation((fn: (t: typeof tx) => Promise<void>) => fn(tx));
    (db.query.adminDiscordIds.findFirst as unknown as Mock).mockResolvedValue(undefined);
  });

  it('数字だけの妥当な ID と表示名なら登録する', async () => {
    const result = await addAdminDiscordId('988442447187165254', 'INTERNET');

    expect(result.success).toBe(true);
    expect(values).toHaveBeenCalledWith({
      discordId: '988442447187165254',
      label: 'INTERNET',
      createdBy: 'admin-1',
    });
  });

  it('数字以外を含む ID は登録せず理由を返す', async () => {
    const result = await addAdminDiscordId('98844244abc', 'INTERNET');

    expect(result).toEqual({ success: false, error: 'Discord ID は17桁から20桁の数字で入力してください' });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('桁数が足りない ID は登録せず理由を返す', async () => {
    const result = await addAdminDiscordId('12345', 'INTERNET');

    expect(result.success).toBe(false);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('表示名が空白だけなら登録せず理由を返す', async () => {
    const result = await addAdminDiscordId('988442447187165254', '   ');

    expect(result).toEqual({ success: false, error: '表示名を入力してください' });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('表示名の前後の空白は落として登録する', async () => {
    await addAdminDiscordId('988442447187165254', '  INTERNET  ');

    expect(values).toHaveBeenCalledWith({
      discordId: '988442447187165254',
      label: 'INTERNET',
      createdBy: 'admin-1',
    });
  });

  it('登録済みの ID は重ねて登録せず理由を返す', async () => {
    (db.query.adminDiscordIds.findFirst as unknown as Mock).mockResolvedValue({
      discordId: '988442447187165254',
    });

    const result = await addAdminDiscordId('988442447187165254', 'INTERNET');

    expect(result).toEqual({ success: false, error: 'この Discord ID は既に登録されています' });
    expect(db.transaction).not.toHaveBeenCalled();
  });
});

describe('removeAdminDiscordId', () => {
  const returning = vi.fn().mockResolvedValue([{ label: 'INTERNET' }]);
  const where = vi.fn().mockReturnValue({ returning });
  const del = vi.fn().mockReturnValue({ where });
  const tx = { delete: del };

  beforeEach(() => {
    vi.clearAllMocks();
    where.mockReturnValue({ returning });
    del.mockReturnValue({ where });
    (db.transaction as unknown as Mock).mockImplementation((fn: (t: typeof tx) => Promise<void>) => fn(tx));
  });

  it('指定した ID を一覧から削除する', async () => {
    const result = await removeAdminDiscordId('988442447187165254');

    expect(result.success).toBe(true);
    expect(del).toHaveBeenCalled();
  });

  it('該当が無ければ削除の記録は残さない', async () => {
    returning.mockResolvedValue([]);

    const result = await removeAdminDiscordId('111111111111111111');

    expect(result.success).toBe(true);
    expect(logAdminAction).not.toHaveBeenCalled();
  });
});
