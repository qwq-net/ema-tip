import { db } from '@/shared/db';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteHorse, getHorse } from './actions';

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
      raceEntries: { findFirst: vi.fn() },
      horses: { findFirst: vi.fn() },
    },
  },
}));

describe('deleteHorse', () => {
  const deleteWhere = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    (db.delete as unknown as Mock).mockReturnValue({ where: deleteWhere });
  });

  it('出走記録がある馬は削除せず、理由をエラーとして返す', async () => {
    (db.query.raceEntries.findFirst as unknown as Mock).mockResolvedValue({ id: 'entry-1' });

    const result = await deleteHorse('horse-1');

    expect(result).toEqual({ success: false, error: '出走記録がある馬は削除できません' });
    expect(db.delete).not.toHaveBeenCalled();
  });

  it('出走記録がない馬は削除して成功を返す', async () => {
    (db.query.raceEntries.findFirst as unknown as Mock).mockResolvedValue(undefined);

    const result = await deleteHorse('horse-1');

    expect(result.success).toBe(true);
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});

describe('getHorse', () => {
  it('存在しない id では throw せず undefined を返す', async () => {
    (db.query.horses.findFirst as unknown as Mock).mockResolvedValue(undefined);

    await expect(getHorse('missing')).resolves.toBeUndefined();
  });
});
