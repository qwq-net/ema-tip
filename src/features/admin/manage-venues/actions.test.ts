import { db } from '@/shared/db';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteVenue } from './actions';

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

describe('deleteVenue', () => {
  const deleteWhere = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    (db.delete as unknown as Mock).mockReturnValue({ where: deleteWhere });
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue(undefined);
    (db.query.raceDefinitions.findFirst as unknown as Mock).mockResolvedValue(undefined);
  });

  it('レースで使用中の競馬場は削除せず、理由をエラーとして返す', async () => {
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue({ id: 'race-1' });

    const result = await deleteVenue('venue-1');

    expect(result).toEqual({ success: false, error: 'レースまたはレース定義で使用中の競馬場は削除できません' });
    expect(db.delete).not.toHaveBeenCalled();
  });

  it('レース定義の既定競馬場になっている競馬場も削除しない', async () => {
    (db.query.raceDefinitions.findFirst as unknown as Mock).mockResolvedValue({ id: 'def-1' });

    const result = await deleteVenue('venue-1');

    expect(result.success).toBe(false);
    expect(db.delete).not.toHaveBeenCalled();
  });

  it('どこからも参照されていない競馬場は削除して成功を返す', async () => {
    const result = await deleteVenue('venue-1');

    expect(result.success).toBe(true);
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});
