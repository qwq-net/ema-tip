import { db } from '@/shared/db';
import { ADMIN_ERRORS } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateGuaranteedOdds } from './update-odds';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } }),
    revalidateRacePaths: vi.fn(),
  };
});

vi.mock('@/shared/utils/admin-audit', () => ({
  logAdminAction: vi.fn(),
}));

vi.mock('@/shared/db', () => ({
  db: {
    update: vi.fn(),
    query: {
      raceInstances: { findFirst: vi.fn() },
      payoutResults: { findFirst: vi.fn() },
    },
  },
}));

describe('updateGuaranteedOdds', () => {
  const mockSet = vi.fn();
  const mockWhere = vi.fn();
  const mockReturning = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.query.raceInstances.findFirst).mockResolvedValue({ status: 'SCHEDULED' } as never);
    vi.mocked(db.query.payoutResults.findFirst).mockResolvedValue(undefined);
    mockReturning.mockResolvedValue([{ id: 'race1' }]);
    mockWhere.mockReturnValue({ returning: mockReturning });
    mockSet.mockReturnValue({ where: mockWhere });
    (db.update as unknown as Mock).mockReturnValue({ set: mockSet });
  });

  it('レースが無ければエラーを返し、監査ログを残さない', async () => {
    mockReturning.mockResolvedValue([]);

    await expect(updateGuaranteedOdds('missing', { win: 3.0 })).resolves.toEqual({
      success: false,
      error: ADMIN_ERRORS.NOT_FOUND,
    });
    expect(logAdminAction).not.toHaveBeenCalled();
  });

  // 払戻表は着順確定で作られ、以後の保証オッズ変更は計算済みの払戻と食い違う。UI で閉じるだけでなくサーバーでも拒否する
  it('払戻確定済みのレースは保存せずエラーを返す', async () => {
    vi.mocked(db.query.raceInstances.findFirst).mockResolvedValue({ status: 'FINALIZED' } as never);

    const result = await updateGuaranteedOdds('race1', { win: 3.0 });

    expect(result).toEqual({ success: false, error: expect.stringContaining('着順確定') });
    expect(db.update).not.toHaveBeenCalled();
  });

  it('払戻表が作られたレースは保存せずエラーを返す', async () => {
    vi.mocked(db.query.payoutResults.findFirst).mockResolvedValue({ id: 'payout-1' } as never);

    const result = await updateGuaranteedOdds('race1', { win: 3.0 });

    expect(result.success).toBe(false);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('保存に成功すると監査ログを 1 件記録する', async () => {
    await updateGuaranteedOdds('race1', { win: 3.0 });

    expect(logAdminAction).toHaveBeenCalledTimes(1);
    expect(logAdminAction).toHaveBeenCalledWith(
      db,
      { id: 'admin-1', role: 'ADMIN' },
      { action: 'race.update_guaranteed_odds', targetId: 'race1', detail: { win: 3.0 } }
    );
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
