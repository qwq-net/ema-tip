import { db } from '@/shared/db';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateGuaranteedOdds } from './update-odds';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn().mockResolvedValue({ user: { role: 'ADMIN' } }),
    revalidateRacePaths: vi.fn(),
  };
});

vi.mock('@/shared/db', () => ({
  db: { update: vi.fn() },
}));

describe('updateGuaranteedOdds', () => {
  const mockSet = vi.fn();
  const mockWhere = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    mockSet.mockReturnValue({ where: mockWhere });
    (db.update as unknown as Mock).mockReturnValue({ set: mockSet });
  });

  it('1.1 未満の倍率は保存せずエラーを返す', async () => {
    const result = await updateGuaranteedOdds('race1', { win: 1.0 });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('1.1');
    expect(db.update).not.toHaveBeenCalled();
  });

  it('有効な倍率はレース行へ保存する', async () => {
    const result = await updateGuaranteedOdds('race1', { win: 3.0 });

    expect(result.success).toBe(true);
    expect(mockSet).toHaveBeenCalledWith({ guaranteedOdds: { win: 3.0 } });
  });

  it('空の設定は全券種をデフォルト参照にする指定として保存できる', async () => {
    const result = await updateGuaranteedOdds('race1', {});

    expect(result.success).toBe(true);
    expect(mockSet).toHaveBeenCalledWith({ guaranteedOdds: {} });
  });
});
