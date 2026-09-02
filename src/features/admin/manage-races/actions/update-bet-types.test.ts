import { db } from '@/shared/db';
import { ADMIN_ERRORS } from '@/shared/utils/admin';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateRaceAllowedBetTypes } from './update-bet-types';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn(),
    revalidateRacePaths: vi.fn(),
  };
});

vi.mock('@/shared/utils/admin-audit', () => ({
  logAdminAction: vi.fn(),
}));

vi.mock('@/shared/db', () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe('updateRaceAllowedBetTypes', () => {
  const raceId = 'race-123';

  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
  const mockInsertValues = vi.fn().mockResolvedValue(undefined);
  const mockTx = {
    delete: vi.fn(),
    insert: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockTx.delete.mockReturnValue({ where: mockDeleteWhere });
    mockTx.insert.mockReturnValue({ values: mockInsertValues });
    (db.transaction as unknown as Mock).mockImplementation(async (cb: (tx: typeof mockTx) => Promise<void>) =>
      cb(mockTx)
    );
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { id: 'admin-1' } });
  });

  it('管理者でない場合はエラーをスローする', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockRejectedValue(new Error(ADMIN_ERRORS.UNAUTHORIZED));

    await expect(updateRaceAllowedBetTypes(raceId, ['win'])).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });

  it('null は全行削除のみを行い SSE を emit する', async () => {
    const { raceEventEmitter } = await import('@/shared/lib/sse/event-emitter');

    await updateRaceAllowedBetTypes(raceId, null);

    expect(mockTx.delete).toHaveBeenCalledTimes(1);
    expect(mockTx.insert).not.toHaveBeenCalled();
    expect(raceEventEmitter.emit).toHaveBeenCalledWith('BET_RESTRICTION_UPDATED', expect.objectContaining({ raceId }));
  });

  it('配列は削除後に表示順で insert する', async () => {
    await updateRaceAllowedBetTypes(raceId, ['trifecta', 'win']);

    expect(mockTx.delete).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith([
      { raceId, betType: 'win' },
      { raceId, betType: 'trifecta' },
    ]);
  });

  it('空配列は INVALID_INPUT エラーをスローする', async () => {
    await expect(updateRaceAllowedBetTypes(raceId, [])).rejects.toThrow(ADMIN_ERRORS.INVALID_INPUT);
  });

  it('不正な種別を含む場合は INVALID_INPUT エラーをスローする', async () => {
    await expect(updateRaceAllowedBetTypes(raceId, ['single' as never])).rejects.toThrow(ADMIN_ERRORS.INVALID_INPUT);
  });
});
