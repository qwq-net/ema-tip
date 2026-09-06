import { db } from '@/shared/db';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveEntries } from './actions';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn().mockResolvedValue({ user: { role: 'ADMIN' } }),
  };
});

vi.mock('@/shared/db', () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe('saveEntries', () => {
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const mockTx = {
    delete: vi.fn().mockReturnValue({ where: deleteWhere }),
    insert: vi.fn().mockReturnValue({ values: insertValues }),
    query: {
      raceInstances: { findFirst: vi.fn() },
      bets: { findFirst: vi.fn() },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.query.raceInstances.findFirst.mockResolvedValue({ status: 'SCHEDULED' });
    mockTx.delete.mockReturnValue({ where: deleteWhere });
    mockTx.insert.mockReturnValue({ values: insertValues });
    (db.transaction as unknown as Mock).mockImplementation(async (cb: (tx: typeof mockTx) => Promise<void>) =>
      cb(mockTx)
    );
  });

  it('ベットが存在するレースでは保存せず、理由をエラーとして返すこと', async () => {
    mockTx.query.bets.findFirst.mockResolvedValue({ id: 'bet-1' });

    const result = await saveEntries('race-1', ['horse-1', 'horse-2']);

    expect(result).toEqual({ success: false, error: '馬券が購入済みのため、出走馬を変更できません' });
    expect(mockTx.delete).not.toHaveBeenCalled();
  });

  it('ベットがないレースではエントリを再作成できること', async () => {
    mockTx.query.bets.findFirst.mockResolvedValue(undefined);

    const result = await saveEntries('race-1', ['horse-1', 'horse-2']);

    expect(result.success).toBe(true);
    expect(mockTx.delete).toHaveBeenCalled();
    expect(mockTx.insert).toHaveBeenCalled();
  });

  it('19頭以上の登録は拒否し、エントリを削除しないこと', async () => {
    const horseIds = Array.from({ length: 19 }, (_, i) => `horse-${i + 1}`);

    const result = await saveEntries('race-1', horseIds);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('18頭まで');
    expect(mockTx.delete).not.toHaveBeenCalled();
  });

  it('18頭ちょうどの登録は受け付けること', async () => {
    mockTx.query.bets.findFirst.mockResolvedValue(undefined);
    const horseIds = Array.from({ length: 18 }, (_, i) => `horse-${i + 1}`);

    await saveEntries('race-1', horseIds);

    expect(mockTx.insert).toHaveBeenCalled();
  });

  it('出走前以外のレースでは保存を拒否し、エントリを削除しないこと', async () => {
    mockTx.query.raceInstances.findFirst.mockResolvedValue({ status: 'FINALIZED' });
    mockTx.query.bets.findFirst.mockResolvedValue(undefined);

    const result = await saveEntries('race-1', ['horse-1']);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('出走前');
    expect(mockTx.delete).not.toHaveBeenCalled();
  });
});
