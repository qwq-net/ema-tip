import { db } from '@/shared/db';
import { ADMIN_ERRORS } from '@/shared/utils/admin';
import { revalidatePath } from 'next/cache';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRace } from './create';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn(),
  };
});

vi.mock('@/shared/db', () => ({
  db: {
    insert: vi.fn(),
    query: {
      raceInstances: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      venues: {
        findFirst: vi.fn().mockResolvedValue({ shortName: 'Tok' }),
      },
      guaranteedOddsMaster: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  },
}));

describe('createRace', () => {
  const mockInsert = vi.fn();
  const mockValues = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockInsert.mockReturnValue({ values: mockValues });
    (db.insert as unknown as Mock).mockImplementation(mockInsert);
  });

  it('ユーザーが管理者でない場合、Unauthorizedエラーをスローすること', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockRejectedValue(new Error(ADMIN_ERRORS.UNAUTHORIZED));
    const formData = new FormData();

    await expect(createRace(formData)).rejects.toThrow(ADMIN_ERRORS.UNAUTHORIZED);
  });

  it('formDataが空の場合、Invalid Inputエラーをスローすること', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
    const formData = new FormData();

    await expect(createRace(formData)).rejects.toThrow(ADMIN_ERRORS.INVALID_INPUT);
  });

  it('有効なデータであればレースを正常に作成すること', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });

    const formData = new FormData();
    formData.append('eventId', '550e8400-e29b-41d4-a716-446655440000');
    formData.append('date', '2024-01-01');

    formData.append('name', 'New Year Cup');
    formData.append('distance', '2000');
    formData.append('surface', '芝');
    formData.append('condition', '良');
    formData.append('closingAt', '2024-01-01T10:00:00');
    formData.append('venueId', 'venue_id');

    await createRace(formData);

    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'New Year Cup',
        distance: 2000,
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/admin/races');
  });

  it('raceNumberが未指定の場合、既存レースの最大番号+1が自動付与される', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
    (db.query.raceInstances.findMany as unknown as Mock).mockResolvedValue([
      { raceNumber: 3 },
      { raceNumber: 1 },
      { raceNumber: 5 },
    ]);

    const formData = new FormData();
    formData.append('eventId', 'event-1');
    formData.append('date', '2026-03-10');
    formData.append('name', 'Auto Number Race');
    formData.append('distance', '1600');
    formData.append('surface', '芝');
    formData.append('venueId', 'venue-1');

    await createRace(formData);

    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ raceNumber: 6 }));
  });

  it('raceNumberが指定されている場合はそのまま使用される', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });

    const formData = new FormData();
    formData.append('eventId', 'event-1');
    formData.append('date', '2026-03-10');
    formData.append('name', 'Manual Number Race');
    formData.append('distance', '1600');
    formData.append('surface', '芝');
    formData.append('venueId', 'venue-1');
    formData.append('raceNumber', '10');

    await createRace(formData);

    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ raceNumber: 10 }));
  });

  it('距離が100未満の場合はバリデーションエラーになる', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });

    const formData = new FormData();
    formData.append('eventId', 'event-1');
    formData.append('date', '2026-03-10');
    formData.append('name', 'Short Race');
    formData.append('distance', '50');
    formData.append('surface', '芝');
    formData.append('venueId', 'venue-1');

    await expect(createRace(formData)).rejects.toThrow(ADMIN_ERRORS.INVALID_INPUT);
  });

  it('guaranteedOddsMaster のデータが保証オッズとして設定される', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
    (db.query.guaranteedOddsMaster.findMany as unknown as Mock).mockResolvedValue([
      { key: 'win', odds: '3.5' },
      { key: 'place', odds: '1.5' },
    ]);

    const formData = new FormData();
    formData.append('eventId', 'event-1');
    formData.append('date', '2026-03-10');
    formData.append('name', 'Guaranteed Odds Race');
    formData.append('distance', '1600');
    formData.append('surface', '芝');
    formData.append('venueId', 'venue-1');

    await createRace(formData);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        guaranteedOdds: { win: 3.5, place: 1.5 },
      })
    );
  });

  it('作成時のステータスはSCHEDULEDで初期化される', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });

    const formData = new FormData();
    formData.append('eventId', 'event-1');
    formData.append('date', '2026-03-10');
    formData.append('name', 'Status Test Race');
    formData.append('distance', '1600');
    formData.append('surface', '芝');
    formData.append('venueId', 'venue-1');

    await createRace(formData);

    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ status: 'SCHEDULED' }));
  });

  it('既存レースがない場合、raceNumber=1が自動付与される', async () => {
    const { requireAdmin } = await import('@/shared/utils/admin');
    (requireAdmin as unknown as Mock).mockResolvedValue({ user: { role: 'ADMIN' } });
    (db.query.raceInstances.findMany as unknown as Mock).mockResolvedValue([]);

    const formData = new FormData();
    formData.append('eventId', 'event-1');
    formData.append('date', '2026-03-10');
    formData.append('name', 'First Race');
    formData.append('distance', '1600');
    formData.append('surface', '芝');
    formData.append('venueId', 'venue-1');

    await createRace(formData);

    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ raceNumber: 1 }));
  });
});
