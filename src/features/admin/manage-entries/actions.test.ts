import { db } from '@/shared/db';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveEntries } from './actions';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireAdmin: vi.fn().mockResolvedValue({ user: { role: 'ADMIN' } }),
  };
});

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

  it('ベットが存在するレースでは保存を拒否し、エントリを削除しないこと', async () => {
    mockTx.query.bets.findFirst.mockResolvedValue({ id: 'bet-1' });

    await expect(saveEntries('race-1', ['horse-1', 'horse-2'])).rejects.toThrow();
    expect(mockTx.delete).not.toHaveBeenCalled();
  });

  it('ベットがないレースではエントリを再作成できること', async () => {
    mockTx.query.bets.findFirst.mockResolvedValue(undefined);

    await saveEntries('race-1', ['horse-1', 'horse-2']);

    expect(mockTx.delete).toHaveBeenCalled();
    expect(mockTx.insert).toHaveBeenCalled();
  });

  it('出走前以外のレースでは保存を拒否し、エントリを削除しないこと', async () => {
    mockTx.query.raceInstances.findFirst.mockResolvedValue({ status: 'FINALIZED' });
    mockTx.query.bets.findFirst.mockResolvedValue(undefined);

    await expect(saveEntries('race-1', ['horse-1'])).rejects.toThrow('出走前');
    expect(mockTx.delete).not.toHaveBeenCalled();
  });
});
