import { db } from '@/shared/db';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { ActionError, ADMIN_ERRORS } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateRankingDisplayMode } from './actions';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn(),
  };
});

vi.mock('@/shared/utils/admin-audit', () => ({
  logAdminAction: vi.fn(),
}));

vi.mock('@/shared/db', () => ({
  db: { update: vi.fn() },
}));

describe('updateRankingDisplayMode', () => {
  const admin = { id: 'admin-1', name: 'Admin' };
  const mockReturning = vi.fn();
  const mockWhere = vi.fn();
  const mockSet = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    mockWhere.mockReturnValue({ returning: mockReturning });
    mockSet.mockReturnValue({ where: mockWhere });
    (db.update as unknown as Mock).mockReturnValue({ set: mockSet });
    mockReturning.mockResolvedValue([{ id: 'event-1' }]);
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: admin });
  });

  it('管理者でなければ更新せずエラーを返す', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockRejectedValue(new ActionError(ADMIN_ERRORS.UNAUTHORIZED));

    await expect(updateRankingDisplayMode('event-1', 'FULL')).resolves.toEqual({
      success: false,
      error: ADMIN_ERRORS.UNAUTHORIZED,
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  it('イベントが無ければエラーを返し、SSE も監査ログも出さない', async () => {
    mockReturning.mockResolvedValue([]);

    await expect(updateRankingDisplayMode('missing', 'FULL')).resolves.toEqual({
      success: false,
      error: ADMIN_ERRORS.NOT_FOUND,
    });
    expect(raceEventEmitter.emit).not.toHaveBeenCalled();
    expect(logAdminAction).not.toHaveBeenCalled();
  });

  it('更新に成功すると SSE を通知し監査ログを 1 件記録する', async () => {
    const result = await updateRankingDisplayMode('event-1', 'FULL_WITH_LOAN');

    expect(result.success).toBe(true);
    expect(mockSet).toHaveBeenCalledWith({ rankingDisplayMode: 'FULL_WITH_LOAN' });
    expect(raceEventEmitter.emit).toHaveBeenCalledWith(RACE_EVENTS.RANKING_UPDATED, {
      eventId: 'event-1',
      mode: 'FULL_WITH_LOAN',
    });
    expect(logAdminAction).toHaveBeenCalledTimes(1);
    expect(logAdminAction).toHaveBeenCalledWith(db, admin, {
      action: 'event.update_ranking_display_mode',
      targetId: 'event-1',
      detail: { mode: 'FULL_WITH_LOAN' },
    });
  });
});
