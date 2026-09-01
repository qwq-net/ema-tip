import { db } from '@/shared/db';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRaceResults } from './revert';

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

vi.mock('@/shared/config/auth', () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/shared/db', () => ({
  db: {
    transaction: vi.fn(),
    query: {
      raceInstances: { findFirst: vi.fn() },
    },
  },
}));

vi.mock('@/shared/db/schema', () => ({
  raceInstances: { id: 'raceInstances.id', status: 'status' },
  raceEntries: { raceId: 'raceEntries.raceId' },
  payoutResults: { raceId: 'payoutResults.raceId' },
}));

vi.mock('@/shared/lib/sse/event-emitter', () => ({
  raceEventEmitter: { emit: vi.fn() },
  RACE_EVENTS: { RACE_RESULT_UPDATED: 'RACE_RESULT_UPDATED' },
}));

describe('resetRaceResults', () => {
  const raceId = 'race-123';

  const createMockTx = () => {
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    const updateChain = { set: updateSet, where: updateWhere };

    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const deleteChain = { where: deleteWhere };

    return {
      execute: vi.fn().mockResolvedValue(undefined),
      query: {
        raceInstances: {
          findFirst: vi.fn().mockResolvedValue({ id: raceId, status: 'CLOSED' }),
        },
        bet5Events: {
          findFirst: vi.fn().mockResolvedValue(undefined),
        },
      },
      update: vi.fn().mockReturnValue(updateChain),
      delete: vi.fn().mockReturnValue(deleteChain),
      _updateChain: updateChain,
      _deleteChain: deleteChain,
    };
  };
  let mockTx: ReturnType<typeof createMockTx>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTx = createMockTx();

    (db.transaction as unknown as Mock).mockImplementation(async (cb: (tx: typeof mockTx) => Promise<void>) =>
      cb(mockTx)
    );
  });

  async function setupAdminAuth() {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
  }

  it('BET5精算済みイベントの構成レースはリセットできない', async () => {
    await setupAdminAuth();
    mockTx.query.bet5Events.findFirst.mockResolvedValue({ id: 'bet5-1' });

    await expect(resetRaceResults(raceId)).rejects.toThrow('BET5');
    expect(mockTx.update).not.toHaveBeenCalled();
    expect(mockTx.delete).not.toHaveBeenCalled();
  });

  it('トランザクション内で advisory lock を取得する', async () => {
    await setupAdminAuth();

    await resetRaceResults(raceId);

    expect(mockTx.execute).toHaveBeenCalledTimes(1);
    const lockArg = JSON.stringify(mockTx.execute.mock.calls[0][0]);
    expect(lockArg).toContain('pg_advisory_xact_lock');
  });

  it('advisory lock のキーに payout と同じく raceId が含まれる', async () => {
    await setupAdminAuth();

    await resetRaceResults(raceId);

    const lockArg = JSON.stringify(mockTx.execute.mock.calls[0][0]);
    expect(lockArg).toContain(`payout:${raceId}`);
  });

  it('競合対策としてロック取得後にステータスを再チェックする', async () => {
    await setupAdminAuth();

    const callOrder: string[] = [];
    mockTx.execute.mockImplementation(async () => {
      callOrder.push('lock');
    });
    mockTx.query.raceInstances.findFirst.mockImplementation(async () => {
      callOrder.push('readRace');
      return { id: raceId, status: 'CLOSED' };
    });

    await resetRaceResults(raceId);

    expect(callOrder[0]).toBe('lock');
    expect(callOrder[1]).toBe('readRace');
  });

  it('競合シナリオでロック後にレースが FINALIZED になっていた場合はエラーをスローする', async () => {
    await setupAdminAuth();
    mockTx.query.raceInstances.findFirst.mockResolvedValue({ id: raceId, status: 'FINALIZED' });

    await expect(resetRaceResults(raceId)).rejects.toThrow('確定済みのレースはリセットできません');
  });

  it('レースが見つからない場合はエラーをスローする', async () => {
    await setupAdminAuth();
    mockTx.query.raceInstances.findFirst.mockResolvedValue(null);

    await expect(resetRaceResults(raceId)).rejects.toThrow('レースが見つかりませんでした');
  });

  it('正常系: 着順リセットと払戻結果の削除が行われる', async () => {
    await setupAdminAuth();

    const result = await resetRaceResults(raceId);

    expect(result).toEqual({ success: true });
    expect(mockTx.update).toHaveBeenCalled();
    expect(mockTx.delete).toHaveBeenCalled();
  });

  it('リセット完了後にSSEイベント RACE_RESULT_UPDATED が空の結果で発火される', async () => {
    await setupAdminAuth();
    const { raceEventEmitter } = await import('@/shared/lib/sse/event-emitter');

    await resetRaceResults(raceId);

    expect(raceEventEmitter.emit).toHaveBeenCalledWith(
      'RACE_RESULT_UPDATED',
      expect.objectContaining({
        raceId,
        results: [],
      })
    );
  });

  it('管理者でない場合はエラーをスローする', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockRejectedValue(new Error('認証されていません'));

    await expect(resetRaceResults(raceId)).rejects.toThrow('認証されていません');
  });

  it('CLOSED状態のレースはリセットできる', async () => {
    await setupAdminAuth();
    mockTx.query.raceInstances.findFirst.mockResolvedValue({ id: raceId, status: 'CLOSED' });

    const result = await resetRaceResults(raceId);

    expect(result).toEqual({ success: true });
  });

  it('SCHEDULED状態のレースもリセットできる', async () => {
    await setupAdminAuth();
    mockTx.query.raceInstances.findFirst.mockResolvedValue({ id: raceId, status: 'SCHEDULED' });

    const result = await resetRaceResults(raceId);

    expect(result).toEqual({ success: true });
  });
});
