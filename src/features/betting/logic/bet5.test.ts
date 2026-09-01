import { db } from '@/shared/db';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateBet5Payout, closeBet5Event, resolveBet5Winners } from './bet5';

vi.mock('@/shared/db', () => ({
  db: {
    transaction: vi.fn(),
    query: {
      bet5Events: { findFirst: vi.fn() },
    },
    update: vi.fn(),
  },
}));

vi.mock('@/shared/db/schema', () => ({
  bet5Events: { id: 'bet5Events.id' },
  bet5Tickets: { id: 'bet5Tickets.id', bet5EventId: 'bet5Tickets.bet5EventId' },
  events: { id: 'events.id', carryoverAmount: 'events.carryoverAmount' },
  wallets: { id: 'wallets.id', balance: 'wallets.balance' },
  transactions: {},
  raceEntries: { raceId: 'raceEntries.raceId', finishPosition: 'raceEntries.finishPosition' },
}));

const makeUpdateChain = () => {
  const chain = { set: vi.fn(), where: vi.fn().mockResolvedValue(undefined) };
  chain.set.mockReturnValue(chain);
  return chain;
};

const makeInsertChain = () => ({ values: vi.fn().mockResolvedValue(undefined) });

describe('calculateBet5Payout', () => {
  const bet5EventId = 'bet5-event-id-123';
  const raceIds = ['race-1', 'race-2', 'race-3', 'race-4', 'race-5'];

  const baseBet5Event = {
    id: bet5EventId,
    status: 'CLOSED',
    race1Id: raceIds[0],
    race2Id: raceIds[1],
    race3Id: raceIds[2],
    race4Id: raceIds[3],
    race5Id: raceIds[4],
    initialPot: 5000,
    event: { id: 'event-1', carryoverAmount: 0 },
  };

  const allWinnerRows = raceIds.map((raceId, i) => ({
    raceId,
    horseId: `horse-${i + 1}`,
    finishPosition: 1,
  }));

  const winningTicket = {
    id: 'ticket-win',
    walletId: 'wallet-1',
    amount: 400,
    race1HorseIds: ['horse-1'],
    race2HorseIds: ['horse-2'],
    race3HorseIds: ['horse-3'],
    race4HorseIds: ['horse-4'],
    race5HorseIds: ['horse-5'],
  };

  const losingTicket = {
    id: 'ticket-lose',
    walletId: 'wallet-2',
    amount: 200,
    race1HorseIds: ['horse-X'],
    race2HorseIds: ['horse-2'],
    race3HorseIds: ['horse-3'],
    race4HorseIds: ['horse-4'],
    race5HorseIds: ['horse-5'],
  };

  const createMockTx = () => {
    const updateChain = makeUpdateChain();
    // ウォレット行ロック取得の select().from().where().orderBy().for('update') を受ける連鎖
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      for: vi.fn().mockResolvedValue([]),
    };
    return {
      execute: vi.fn().mockResolvedValue(undefined),
      query: {
        bet5Events: { findFirst: vi.fn().mockResolvedValue(baseBet5Event) },
        raceEntries: { findMany: vi.fn().mockResolvedValue(allWinnerRows) },
        bet5Tickets: { findMany: vi.fn().mockResolvedValue([winningTicket]) },
      },
      select: vi.fn().mockReturnValue(selectChain),
      update: vi.fn().mockReturnValue(updateChain),
      insert: vi.fn().mockReturnValue(makeInsertChain()),
      _updateChain: updateChain,
    };
  };
  let mockTx: ReturnType<typeof createMockTx>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTx = createMockTx();
    (db.transaction as unknown as Mock).mockImplementation(async (cb: (tx: typeof mockTx) => Promise<void>) =>
      cb(mockTx)
    );
  });

  it('トランザクション開始直後に advisory lock を取得する', async () => {
    mockTx.query.bet5Events.findFirst.mockResolvedValueOnce({ ...baseBet5Event, status: 'FINALIZED' });

    await calculateBet5Payout(bet5EventId);

    expect(mockTx.execute).toHaveBeenCalledTimes(1);
    const lockArg = JSON.stringify(mockTx.execute.mock.calls[0][0]);
    expect(lockArg).toContain('pg_advisory_xact_lock');
  });

  it('advisory lock のキーに bet5EventId が含まれる', async () => {
    mockTx.query.bet5Events.findFirst.mockResolvedValueOnce({ ...baseBet5Event, status: 'FINALIZED' });

    await calculateBet5Payout(bet5EventId);

    const lockArg = JSON.stringify(mockTx.execute.mock.calls[0][0]);
    expect(lockArg).toContain(bet5EventId);
  });

  it('advisory lock 取得後に bet5Event を読み取る（ロック順序の保証）', async () => {
    const callOrder: string[] = [];
    mockTx.execute.mockImplementation(async () => {
      callOrder.push('lock');
    });
    mockTx.query.bet5Events.findFirst.mockImplementation(async () => {
      callOrder.push('read');
      return { ...baseBet5Event, status: 'FINALIZED' };
    });

    await calculateBet5Payout(bet5EventId);

    expect(callOrder[0]).toBe('lock');
    expect(callOrder[1]).toBe('read');
  });

  it('bet5Event が存在しない場合はエラーをスローする', async () => {
    mockTx.query.bet5Events.findFirst.mockResolvedValue(null);

    await expect(calculateBet5Payout(bet5EventId)).rejects.toThrow('Event not found');
  });

  it('すでに FINALIZED の場合は success:false を返す（二重処理ガード）', async () => {
    mockTx.query.bet5Events.findFirst.mockResolvedValue({ ...baseBet5Event, status: 'FINALIZED' });

    const result = await calculateBet5Payout(bet5EventId);

    expect(result).toEqual({ success: false, message: 'Already finalized' });
    expect(mockTx.update).not.toHaveBeenCalled();
    expect(mockTx.insert).not.toHaveBeenCalled();
  });

  it('SCHEDULED のままの場合は精算せず success:false を返す', async () => {
    mockTx.query.bet5Events.findFirst.mockResolvedValue({ ...baseBet5Event, status: 'SCHEDULED' });

    const result = await calculateBet5Payout(bet5EventId);

    expect(result).toMatchObject({ success: false });
    expect(mockTx.update).not.toHaveBeenCalled();
    expect(mockTx.insert).not.toHaveBeenCalled();
  });

  it('全レースの1着が揃っていない場合は success:false を返す', async () => {
    mockTx.query.raceEntries.findMany.mockResolvedValue([
      { raceId: raceIds[0], horseId: 'horse-1', finishPosition: 1 },
    ]);

    const result = await calculateBet5Payout(bet5EventId);

    expect(result).toMatchObject({ success: false, winCount: 0 });
  });

  it('的中者あり: ウォレットへ払戻、トランザクション記録、FINALIZED 更新', async () => {
    const result = await calculateBet5Payout(bet5EventId);

    expect(result).toMatchObject({ success: true, winCount: 1 });
    expect(mockTx.update).toHaveBeenCalled();
    expect(mockTx.insert).toHaveBeenCalled();
    const setCall = mockTx._updateChain.set.mock.calls.find(
      (args: unknown[]) => (args[0] as Record<string, unknown>)?.status === 'FINALIZED'
    );
    expect(setCall).toBeDefined();
  });

  it('的中者なし: carryoverAmount が totalPot にセットされ FINALIZED になる', async () => {
    mockTx.query.bet5Tickets.findMany.mockResolvedValue([losingTicket]);

    const result = await calculateBet5Payout(bet5EventId);

    expect(result).toMatchObject({ success: true, winCount: 0 });
    const carryoverSet = mockTx._updateChain.set.mock.calls.find(
      (args: unknown[]) => (args[0] as Record<string, unknown>)?.carryoverAmount !== undefined
    );
    expect(carryoverSet).toBeDefined();
  });

  it('carryoverAmount がある場合は totalPot に加算される', async () => {
    const carryover = 3000;
    mockTx.query.bet5Events.findFirst.mockResolvedValue({
      ...baseBet5Event,
      event: { id: 'event-1', carryoverAmount: carryover },
    });
    mockTx.query.bet5Tickets.findMany.mockResolvedValue([losingTicket]);

    const result = await calculateBet5Payout(bet5EventId);

    expect(result).toMatchObject({ success: true });
    expect((result as { totalPot: number }).totalPot).toBe(baseBet5Event.initialPot + losingTicket.amount + carryover);
  });

  it('的中あり時のキャリーオーバー消費は絶対値0ではなく読み取り分の減算で行う', async () => {
    mockTx.query.bet5Events.findFirst.mockResolvedValue({
      ...baseBet5Event,
      event: { id: 'event-1', carryoverAmount: 2000 },
    });

    await calculateBet5Payout(bet5EventId);

    const zeroCarryoverSet = mockTx._updateChain.set.mock.calls.find(
      (args: unknown[]) => (args[0] as Record<string, unknown>)?.carryoverAmount === 0
    );
    expect(zeroCarryoverSet).toBeUndefined();

    const decrementSet = mockTx._updateChain.set.mock.calls.find((args: unknown[]) => {
      const value = (args[0] as Record<string, unknown>)?.carryoverAmount;
      return value instanceof Object && JSON.stringify(value).includes('2000');
    });
    expect(decrementSet).toBeDefined();
  });

  it('的中者なし時のキャリーオーバーは絶対値SETではなく売上と初期ポット分の加算で行う', async () => {
    mockTx.query.bet5Events.findFirst.mockResolvedValue({
      ...baseBet5Event,
      event: { id: 'event-1', carryoverAmount: 3000 },
    });
    mockTx.query.bet5Tickets.findMany.mockResolvedValue([losingTicket]);

    await calculateBet5Payout(bet5EventId);

    const incrementSet = mockTx._updateChain.set.mock.calls.find((args: unknown[]) => {
      const value = (args[0] as Record<string, unknown>)?.carryoverAmount;
      const increment = baseBet5Event.initialPot + losingTicket.amount;
      return value instanceof Object && JSON.stringify(value).includes(String(increment));
    });
    expect(incrementSet).toBeDefined();

    const absoluteSet = mockTx._updateChain.set.mock.calls.find((args: unknown[]) =>
      Number.isFinite((args[0] as Record<string, unknown>)?.carryoverAmount)
    );
    expect(absoluteSet).toBeUndefined();
  });
});

describe('placeBet5Bet', () => {
  it('対象レースにSCHEDULED以外が含まれる場合は購入を拒否する', async () => {
    const { placeBet5Bet } = await import('./bet5');
    const insertMock = vi.fn();
    const mockTx = {
      execute: vi.fn().mockResolvedValue(undefined),
      query: {
        bet5Events: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'bet5-1',
            status: 'SCHEDULED',
            eventId: 'event-1',
            race1Id: 'r1',
            race2Id: 'r2',
            race3Id: 'r3',
            race4Id: 'r4',
            race5Id: 'r5',
          }),
        },
        raceInstances: {
          findMany: vi.fn().mockResolvedValue([{ id: 'r1', status: 'FINALIZED' }]),
        },
        wallets: { findFirst: vi.fn() },
      },
      insert: insertMock,
      update: vi.fn(),
    };
    (db.transaction as unknown as Mock).mockImplementation(async (cb: (tx: typeof mockTx) => Promise<void>) =>
      cb(mockTx)
    );

    await expect(
      placeBet5Bet({
        userId: 'user-1',
        bet5EventId: 'bet5-1',
        unitAmount: 100,
        selections: { race1: ['h1'], race2: ['h2'], race3: ['h3'], race4: ['h4'], race5: ['h5'] },
      })
    ).rejects.toThrow('対象レース');

    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe('resolveBet5Winners', () => {
  const races = ['r1', 'r2', 'r3', 'r4', 'r5'];

  it('全レースで1着が1頭ずつある場合は順序付き配列を返す', () => {
    const rows = [
      { raceId: 'r3', horseId: 'h3' },
      { raceId: 'r1', horseId: 'h1' },
      { raceId: 'r5', horseId: 'h5' },
      { raceId: 'r2', horseId: 'h2' },
      { raceId: 'r4', horseId: 'h4' },
    ];

    expect(resolveBet5Winners(races, rows)).toEqual(['h1', 'h2', 'h3', 'h4', 'h5']);
  });

  it('いずれかのレースで1着不在ならnullを返す', () => {
    const rows = [
      { raceId: 'r1', horseId: 'h1' },
      { raceId: 'r2', horseId: 'h2' },
      { raceId: 'r3', horseId: 'h3' },
      { raceId: 'r4', horseId: 'h4' },
    ];

    expect(resolveBet5Winners(races, rows)).toBeNull();
  });

  it('いずれかのレースで1着が複数ならnullを返す', () => {
    const rows = [
      { raceId: 'r1', horseId: 'h1a' },
      { raceId: 'r1', horseId: 'h1b' },
      { raceId: 'r2', horseId: 'h2' },
      { raceId: 'r3', horseId: 'h3' },
      { raceId: 'r4', horseId: 'h4' },
      { raceId: 'r5', horseId: 'h5' },
    ];

    expect(resolveBet5Winners(races, rows)).toBeNull();
  });
});

describe('closeBet5Event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SCHEDULED 状態の場合は CLOSED に更新できる', async () => {
    (db.query.bet5Events.findFirst as unknown as Mock).mockResolvedValue({
      id: 'bet5-1',
      status: 'SCHEDULED',
    });

    const updateReturning = vi.fn().mockResolvedValue([{ id: 'bet5-1', status: 'CLOSED' }]);
    const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    (db.update as unknown as Mock).mockReturnValue({ set: updateSet });

    const result = await closeBet5Event('bet5-1');

    expect(result).toEqual({ id: 'bet5-1', status: 'CLOSED' });
  });

  it('CLOSED 状態の場合はエラーをスローする', async () => {
    (db.query.bet5Events.findFirst as unknown as Mock).mockResolvedValue({
      id: 'bet5-1',
      status: 'CLOSED',
    });

    await expect(closeBet5Event('bet5-1')).rejects.toThrow('SCHEDULED 状態の BET5 イベントのみ締切できます');
  });

  it('FINALIZED 状態の場合はエラーをスローする', async () => {
    (db.query.bet5Events.findFirst as unknown as Mock).mockResolvedValue({
      id: 'bet5-1',
      status: 'FINALIZED',
    });

    await expect(closeBet5Event('bet5-1')).rejects.toThrow('SCHEDULED 状態の BET5 イベントのみ締切できます');
  });

  it('存在しない場合はエラーをスローする', async () => {
    (db.query.bet5Events.findFirst as unknown as Mock).mockResolvedValue(null);

    await expect(closeBet5Event('nonexistent')).rejects.toThrow('BET5 event not found');
  });
});
