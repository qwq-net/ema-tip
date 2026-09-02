import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { borrowLoan } from './actions';

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
      events: { findFirst: vi.fn() },
      wallets: { findFirst: vi.fn() },
    },
  },
}));

vi.mock('@/shared/db/schema', () => ({
  events: { id: 'events.id' },
  wallets: {
    id: 'wallets.id',
    userId: 'wallets.userId',
    eventId: 'wallets.eventId',
    balance: 'wallets.balance',
    totalLoaned: 'wallets.totalLoaned',
  },
  transactions: {},
}));

import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';

describe('borrowLoan', () => {
  const userId = 'user-123';
  const eventId = 'event-456';
  const walletId = 'wallet-789';

  const mockEvent = {
    id: eventId,
    status: 'ACTIVE',
    distributeAmount: 10000,
    loanAmount: 5000,
    loanEnabled: true,
    loanThresholdPercent: 30,
  };

  const mockWallet = {
    id: walletId,
    userId,
    eventId,
    balance: 3000,
    totalLoaned: 0,
  };

  const makeUpdateChain = () => {
    const chain = { set: vi.fn(), where: vi.fn().mockResolvedValue(undefined) };
    chain.set.mockReturnValue(chain);
    return chain;
  };

  const makeInsertChain = () => ({ values: vi.fn().mockResolvedValue(undefined) });

  const createMockTx = () => ({
    execute: vi.fn().mockResolvedValue(undefined),
    query: {
      events: { findFirst: vi.fn().mockResolvedValue(mockEvent) },
      wallets: { findFirst: vi.fn().mockResolvedValue(mockWallet) },
    },
    update: vi.fn().mockReturnValue(makeUpdateChain()),
    insert: vi.fn().mockReturnValue(makeInsertChain()),
  });
  let mockTx: ReturnType<typeof createMockTx>;

  beforeEach(() => {
    vi.clearAllMocks();

    (auth as unknown as Mock).mockResolvedValue({ user: { id: userId } });

    (db.query.events.findFirst as unknown as Mock).mockResolvedValue(mockEvent);
    (db.query.wallets.findFirst as unknown as Mock).mockResolvedValue(mockWallet);

    mockTx = createMockTx();

    (db.transaction as unknown as Mock).mockImplementation(async (cb: (tx: typeof mockTx) => Promise<void>) =>
      cb(mockTx)
    );
  });

  it('未認証ユーザーはエラーをスローする', async () => {
    (auth as unknown as Mock).mockResolvedValue(null);

    await expect(borrowLoan(eventId)).rejects.toThrow('Unauthorized');
  });

  it('イベントが存在しない場合はエラーをスローする', async () => {
    (db.query.events.findFirst as unknown as Mock).mockResolvedValue(null);

    await expect(borrowLoan(eventId)).rejects.toThrow('イベントが見つかりません');
  });

  it('イベントがACTIVE以外の場合はエラーをスローする', async () => {
    (db.query.events.findFirst as unknown as Mock).mockResolvedValue({ ...mockEvent, status: 'FINISHED' });

    await expect(borrowLoan(eventId)).rejects.toThrow('このイベントは現在開催中ではありません');
  });

  it('ウォレットが存在しない場合はエラーをスローする', async () => {
    (db.query.wallets.findFirst as unknown as Mock).mockResolvedValue(null);

    await expect(borrowLoan(eventId)).rejects.toThrow('ウォレットが見つかりません');
  });

  it('残高が閾値以上の場合は借入できない', async () => {
    (db.query.wallets.findFirst as unknown as Mock).mockResolvedValue({
      ...mockWallet,
      balance: 7000,
    });

    await expect(borrowLoan(eventId)).rejects.toThrow('現在の残高では借り入れできません');
  });

  it('既に借入済みの場合は二重借入できない', async () => {
    (db.query.wallets.findFirst as unknown as Mock).mockResolvedValue({
      ...mockWallet,
      totalLoaned: 5000,
    });

    await expect(borrowLoan(eventId)).rejects.toThrow('既に借り入れ済みです');
  });

  it('トランザクション内でadvisory lockを取得する', async () => {
    await borrowLoan(eventId);

    expect(mockTx.execute).toHaveBeenCalledTimes(1);
    const lockArg = JSON.stringify(mockTx.execute.mock.calls[0][0]);
    expect(lockArg).toContain('pg_advisory_xact_lock');
    expect(lockArg).toContain(walletId);
  });

  it('競合対策としてadvisory lock取得後にイベントとウォレットを再読み込みする', async () => {
    const callOrder: string[] = [];
    mockTx.execute.mockImplementation(async () => {
      callOrder.push('lock');
    });
    mockTx.query.events.findFirst.mockImplementation(async () => {
      callOrder.push('readEvent');
      return mockEvent;
    });
    mockTx.query.wallets.findFirst.mockImplementation(async () => {
      callOrder.push('readWallet');
      return mockWallet;
    });

    await borrowLoan(eventId);

    expect(callOrder[0]).toBe('lock');
    expect(callOrder[1]).toBe('readEvent');
    expect(callOrder[2]).toBe('readWallet');
  });

  it('競合シナリオでロック後にイベントが非ACTIVEになっていた場合はエラーをスローする', async () => {
    mockTx.query.events.findFirst.mockResolvedValue({ ...mockEvent, status: 'FINISHED' });

    await expect(borrowLoan(eventId)).rejects.toThrow('このイベントは現在開催中ではありません');
  });

  it('競合シナリオでロック後にウォレットがnullの場合はエラーをスローする', async () => {
    mockTx.query.wallets.findFirst.mockResolvedValue(null);

    await expect(borrowLoan(eventId)).rejects.toThrow('ウォレットが見つかりません');
  });

  it('競合シナリオでロック後に残高が増えて閾値以上になった場合は借入できない', async () => {
    mockTx.query.wallets.findFirst.mockResolvedValue({
      ...mockWallet,
      balance: 7000,
    });

    await expect(borrowLoan(eventId)).rejects.toThrow('現在の残高では借り入れできません');
  });

  it('競合シナリオでロック後に既に借入済みになっていた場合は二重借入を防止する', async () => {
    mockTx.query.wallets.findFirst.mockResolvedValue({
      ...mockWallet,
      totalLoaned: 5000,
    });

    await expect(borrowLoan(eventId)).rejects.toThrow('既に借り入れ済みです');
  });

  it('借入成功時にウォレット残高とtotalLoanedが加算される', async () => {
    await borrowLoan(eventId);

    expect(mockTx.update).toHaveBeenCalled();
  });

  it('借入成功時にLOANトランザクションが記録される', async () => {
    await borrowLoan(eventId);

    expect(mockTx.insert).toHaveBeenCalled();
    const insertValues = mockTx.insert.mock.results[0].value.values;
    const valuesArg = insertValues.mock.calls[0][0];
    expect(valuesArg.type).toBe('LOAN');
    expect(valuesArg.amount).toBe(5000);
  });

  it('loanAmountがnullの場合はdistributeAmountがローン金額になる', async () => {
    mockTx.query.events.findFirst.mockResolvedValue({
      ...mockEvent,
      loanAmount: null,
    });

    await borrowLoan(eventId);

    const insertValues = mockTx.insert.mock.results[0].value.values;
    const valuesArg = insertValues.mock.calls[0][0];
    expect(valuesArg.amount).toBe(10000);
  });
});
