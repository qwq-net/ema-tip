import { db } from '@/shared/db';
import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteRace } from './delete';

vi.mock('@/shared/utils/admin', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/utils/admin')>();
  return { ...original, requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin-1', name: '管理者' } }) };
});
vi.mock('@/shared/utils/admin-audit', () => ({ logAdminAction: vi.fn() }));
vi.mock('@/shared/db', () => ({ db: { transaction: vi.fn() } }));

const race = { id: 'race-1', eventId: 'event-1', name: '第1レース' };
const tx = {
  execute: vi.fn(),
  query: {
    raceInstances: { findFirst: vi.fn() },
    betGroups: { findFirst: vi.fn() },
    bet5Events: { findFirst: vi.fn() },
  },
  delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  insert: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));
  tx.query.raceInstances.findFirst.mockResolvedValue(race);
  tx.query.betGroups.findFirst.mockResolvedValue(undefined);
  tx.query.bet5Events.findFirst.mockResolvedValue(undefined);
});

describe('deleteRace', () => {
  it('通常馬券の購入があればレースを削除しない', async () => {
    tx.query.betGroups.findFirst.mockResolvedValue({ id: 'bet-1' });
    const result = await deleteRace(race.id);
    expect(result).toEqual({ success: false, error: expect.stringContaining('購入') });
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it('BET5の対象レースなら先にBET5の取り消しを求める', async () => {
    tx.query.bet5Events.findFirst.mockResolvedValue({ id: 'bet5-1' });
    const result = await deleteRace(race.id);
    expect(result).toEqual({ success: false, error: expect.stringContaining('BET5') });
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it('購入もBET5参照もなければ削除する', async () => {
    const result = await deleteRace(race.id);
    expect(result).toEqual({ success: true, data: undefined });
    expect(tx.delete).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/events/event-1');
  });
});
