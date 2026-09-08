import { db } from '@/shared/db';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteRaceDefinition, getRaceDefinition } from './actions';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn().mockResolvedValue({ user: { role: 'ADMIN' } }),
  };
});

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/shared/db', () => ({
  db: {
    delete: vi.fn(),
    query: {
      raceInstances: { findFirst: vi.fn() },
      raceDefinitions: { findFirst: vi.fn() },
    },
  },
}));

describe('deleteRaceDefinition', () => {
  const deleteWhere = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    (db.delete as unknown as Mock).mockReturnValue({ where: deleteWhere });
  });

  it('レースで使用中のレースマスタは削除せず、理由をエラーとして返す', async () => {
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue({ id: 'race-1' });

    const result = await deleteRaceDefinition('def-1');

    expect(result).toEqual({ success: false, error: 'レースで使用中のレースマスタは削除できません' });
    expect(db.delete).not.toHaveBeenCalled();
  });

  it('未使用のレースマスタは削除して成功を返す', async () => {
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue(undefined);

    const result = await deleteRaceDefinition('def-1');

    expect(result.success).toBe(true);
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});

describe('getRaceDefinition', () => {
  it('存在しない id では throw せず undefined を返す', async () => {
    (db.query.raceDefinitions.findFirst as unknown as Mock).mockResolvedValue(undefined);

    await expect(getRaceDefinition('missing')).resolves.toBeUndefined();
  });
});
