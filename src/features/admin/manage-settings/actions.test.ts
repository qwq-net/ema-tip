import { db } from '@/shared/db';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateSystemDefaultOdds } from './actions';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn().mockResolvedValue({ user: { role: 'ADMIN' } }),
  };
});

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/shared/db', () => ({
  db: { transaction: vi.fn() },
}));

const allTypes = {
  win: 3.5,
  place: 1.5,
  bracket_quinella: 8,
  quinella: 15,
  wide: 5,
  exacta: 30,
  trio: 40,
  trifecta: 200,
};

describe('updateSystemDefaultOdds', () => {
  const mockValues = vi.fn().mockResolvedValue(undefined);
  const mockTx = {
    delete: vi.fn().mockResolvedValue(undefined),
    insert: vi.fn(() => ({ values: mockValues })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (db.transaction as unknown as Mock).mockImplementation(async (cb: (tx: typeof mockTx) => Promise<void>) =>
      cb(mockTx)
    );
  });

  it('券種が欠けていると保存せずエラーを返す', async () => {
    const missingOne = Object.fromEntries(Object.entries(allTypes).filter(([key]) => key !== 'trifecta'));

    const result = await updateSystemDefaultOdds(missingOne);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('全ての券種');
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('1.1 未満の券種があると保存せずエラーを返す', async () => {
    const result = await updateSystemDefaultOdds({ ...allTypes, place: 1.0 });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('1.1');
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('全券種を数値文字列の行へ置き換えて保存する', async () => {
    const result = await updateSystemDefaultOdds(allTypes);

    expect(result.success).toBe(true);
    expect(mockTx.delete).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        { key: 'win', odds: '3.5' },
        { key: 'trifecta', odds: '200' },
      ])
    );
    expect(mockValues.mock.calls[0]![0]).toHaveLength(8);
  });
});
