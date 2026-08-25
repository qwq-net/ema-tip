import { db } from '@/shared/db';
import { ADMIN_ERRORS } from '@/shared/utils/admin';
import { revalidatePath } from 'next/cache';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeRace, reopenRace, setClosingTime, updateRace } from './update';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn(),
  };
});

vi.mock('@/shared/config/auth', () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));
vi.mock('@/shared/db', () => ({
  db: {
    update: vi.fn(),
    transaction: vi.fn((cb) => cb(db)),
    query: {
      raceInstances: {
        findFirst: vi.fn().mockResolvedValue({ id: '123', status: 'SCHEDULED' }),
      },
    },
  },
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('@/shared/lib/sse/event-emitter', () => ({
  raceEventEmitter: {
    emit: vi.fn(),
  },
  RACE_EVENTS: {
    RACE_CLOSED: 'RACE_CLOSED',
    RACE_REOPENED: 'RACE_REOPENED',
  },
}));

vi.mock('@/shared/constants/race', () => ({
  VENUE_DIRECTIONS: ['LEFT', 'RIGHT', 'STRAIGHT'] as const,
  RACE_GRADES: ['G1', 'G2', 'G3', 'L', 'OP', '3_WIN', '2_WIN', '1_WIN', 'MAIDEN', 'NEWCOMER'] as const,
  RACE_TYPES: ['REAL', 'FICTIONAL'] as const,
}));

describe('updateRace', () => {
  const mockUpdate = vi.fn();
  const mockSet = vi.fn();
  const mockWhere = vi.fn();
  const mockTx = {
    update: mockUpdate,
    query: {
      raceInstances: {
        findFirst: vi.fn().mockResolvedValue({ id: '123', status: 'SCHEDULED' }),
      },
      venues: {
        findFirst: vi.fn().mockResolvedValue({ shortName: 'Tok' }),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    (db.transaction as unknown as Mock).mockImplementation(async (cb) => cb(mockTx));
    (db.update as unknown as Mock).mockImplementation(mockUpdate);
  });

  it('ユーザーが管理者でない場合、Unauthorizedエラーをスローすること', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockRejectedValue(new Error(ADMIN_ERRORS.UNAUTHORIZED));
    const formData = new FormData();

    await expect(updateRace('123', formData)).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });

  it('レースを正常に更新すること', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });

    const formData = new FormData();
    formData.append('eventId', '550e8400-e29b-41d4-a716-446655440000');
    formData.append('date', '2024-01-02');

    formData.append('name', 'Kyoto Cup');
    formData.append('distance', '1600');
    formData.append('surface', '芝');
    formData.append('condition', '良');
    formData.append('venueId', 'venue_id');

    await updateRace('123', formData);

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Kyoto Cup',
        distance: 1600,
      })
    );
    expect(mockWhere).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/admin/races');
  });
});

describe('closeRace', () => {
  const mockUpdate = vi.fn();
  const mockSet = vi.fn();
  const mockWhere = vi.fn();
  const mockReturning = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{ id: '123' }]);
    (db.update as unknown as Mock).mockImplementation(mockUpdate);
  });

  it('ユーザーが管理者でない場合、Unauthorizedエラーをスローすること', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockRejectedValue(new Error(ADMIN_ERRORS.UNAUTHORIZED));

    await expect(closeRace('123')).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });

  it('SCHEDULEDのレースを終了しイベントを発行すること', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });

    await closeRace('123');

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith({ status: 'CLOSED' });
    expect(mockWhere).toHaveBeenCalled();

    const { raceEventEmitter } = await import('@/shared/lib/sse/event-emitter');
    expect(raceEventEmitter.emit).toHaveBeenCalledWith('RACE_CLOSED', expect.objectContaining({ raceId: '123' }));

    expect(revalidatePath).toHaveBeenCalled();
  });

  it('FINALIZEDのレースは締め切れずエラーになること', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
    mockReturning.mockResolvedValue([]);
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue({ id: '123', status: 'FINALIZED' });

    await expect(closeRace('123')).rejects.toThrow();

    const { raceEventEmitter } = await import('@/shared/lib/sse/event-emitter');
    expect(raceEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('既にCLOSEDの場合は冪等に成功し、イベントは発行しないこと', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
    mockReturning.mockResolvedValue([]);
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue({ id: '123', status: 'CLOSED' });

    const result = await closeRace('123');

    expect(result).toEqual({ success: true });
    const { raceEventEmitter } = await import('@/shared/lib/sse/event-emitter');
    expect(raceEventEmitter.emit).not.toHaveBeenCalled();
  });
});

describe('reopenRace', () => {
  const mockUpdate = vi.fn();
  const mockSet = vi.fn();
  const mockWhere = vi.fn();
  const mockReturning = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{ id: '123' }]);
    (db.update as unknown as Mock).mockImplementation(mockUpdate);
  });

  it('CLOSED以外のレースは再開できずエラーになること', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
    mockReturning.mockResolvedValue([]);

    await expect(reopenRace('123')).rejects.toThrow();

    const { raceEventEmitter } = await import('@/shared/lib/sse/event-emitter');
    expect(raceEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('管理者でない場合はエラーをスローする', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockRejectedValue(new Error(ADMIN_ERRORS.UNAUTHORIZED));

    await expect(reopenRace('123')).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });

  it('レースをSCHEDULED状態に戻し、closingAtをnullにリセットする', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });

    const result = await reopenRace('123');

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith({ status: 'SCHEDULED', closingAt: null });
    expect(result).toEqual({ success: true });
  });

  it('SSEイベント（RACE_REOPENED）が発火される', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });

    await reopenRace('123');

    const { raceEventEmitter } = await import('@/shared/lib/sse/event-emitter');
    expect(raceEventEmitter.emit).toHaveBeenCalledWith('RACE_REOPENED', expect.objectContaining({ raceId: '123' }));
  });

  it('revalidatePathが呼ばれる', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });

    await reopenRace('123');

    expect(revalidatePath).toHaveBeenCalled();
  });
});

describe('setClosingTime', () => {
  const mockUpdate = vi.fn();
  const mockSet = vi.fn();
  const mockWhere = vi.fn();
  const mockReturning = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{ id: '123' }]);
    (db.update as unknown as Mock).mockImplementation(mockUpdate);
  });

  it('FINALIZEDのレースには締切時刻を設定できずエラーになること', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
    mockReturning.mockResolvedValue([]);

    await expect(setClosingTime('123', 30)).rejects.toThrow();

    const { raceEventEmitter } = await import('@/shared/lib/sse/event-emitter');
    expect(raceEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('管理者でない場合はエラーをスローする', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockRejectedValue(new Error(ADMIN_ERRORS.UNAUTHORIZED));

    await expect(setClosingTime('123', 30)).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });

  it('指定分数後の締切時刻を設定してSCHEDULED状態にする', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });

    const before = Date.now();
    const result = await setClosingTime('123', 30);
    const after = Date.now();

    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'SCHEDULED' }));
    const setArgs = mockSet.mock.calls[0][0];
    const closingAt = setArgs.closingAt as Date;
    const expectedMin = before + 30 * 60 * 1000;
    const expectedMax = after + 30 * 60 * 1000;
    expect(closingAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(closingAt.getTime()).toBeLessThanOrEqual(expectedMax);
    expect(result.success).toBe(true);
    expect(result.closingAt).toBeDefined();
  });

  it('SSEイベント（RACE_REOPENED）が発火される', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });

    await setClosingTime('123', 10);

    const { raceEventEmitter } = await import('@/shared/lib/sse/event-emitter');
    expect(raceEventEmitter.emit).toHaveBeenCalledWith('RACE_REOPENED', expect.objectContaining({ raceId: '123' }));
  });
});

describe('updateRace ステータス遷移', () => {
  const mockUpdate = vi.fn();
  const mockSet = vi.fn();
  const mockWhere = vi.fn();
  const mockTx = {
    update: mockUpdate,
    query: {
      raceInstances: {
        findFirst: vi.fn(),
      },
    },
  };

  const createFormData = (overrides: Record<string, string> = {}) => {
    const defaults: Record<string, string> = {
      eventId: 'event-1',
      date: '2026-03-10',
      venueId: 'venue-1',
      name: 'テストレース',
      distance: '2000',
      surface: 'turf',
    };
    const merged = { ...defaults, ...overrides };
    const fd = new FormData();
    for (const [key, value] of Object.entries(merged)) {
      fd.set(key, value);
    }
    return fd;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    (db.transaction as unknown as Mock).mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
      cb(mockTx)
    );
  });

  it('CLOSED状態のレースに未来の締切時刻を設定するとSCHEDULEDに遷移する', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
    mockTx.query.raceInstances.findFirst.mockResolvedValue({ id: '123', status: 'CLOSED' });

    await updateRace('123', createFormData({ closingAt: '2030-12-31T23:59' }));

    const setArgs = mockSet.mock.calls[0][0];
    expect(setArgs.status).toBe('SCHEDULED');
  });

  it('CLOSED状態のレースに過去の締切時刻を設定してもCLOSEDのまま', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
    mockTx.query.raceInstances.findFirst.mockResolvedValue({ id: '123', status: 'CLOSED' });

    await updateRace('123', createFormData({ closingAt: '2020-01-01T00:00' }));

    const setArgs = mockSet.mock.calls[0][0];
    expect(setArgs.status).toBe('CLOSED');
  });

  it('SCHEDULED状態のレースのステータスは維持される', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
    mockTx.query.raceInstances.findFirst.mockResolvedValue({ id: '123', status: 'SCHEDULED' });

    await updateRace('123', createFormData());

    const setArgs = mockSet.mock.calls[0][0];
    expect(setArgs.status).toBe('SCHEDULED');
  });

  it('FINALIZED状態のレースは更新できずエラーになること', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
    mockTx.query.raceInstances.findFirst.mockResolvedValue({ id: '123', status: 'FINALIZED' });

    await expect(updateRace('123', createFormData({ name: '変更後のレース名' }))).rejects.toThrow();

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
