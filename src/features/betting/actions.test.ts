import { db } from '@/shared/db';
import { ActionError, ADMIN_ERRORS } from '@/shared/utils/admin';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { getUserBetGroupsForRace, placeBets } from './actions';

vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return {
    ...actual,
    requireUser: vi.fn(),
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
    query: {
      raceInstances: { findFirst: vi.fn() },
      events: { findFirst: vi.fn() },
      wallets: { findFirst: vi.fn() },
      betGroups: { findMany: vi.fn() },
      bets: { findMany: vi.fn() },
      raceEntries: { findMany: vi.fn() },
      raceOdds: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
  },
}));

vi.mock('@/entities/bet/lib/payout', async () => {
  const actual = await vi.importActual('@/entities/bet/lib/payout');
  return {
    ...actual,
    isRefundedBet: vi.fn().mockReturnValue(false),
  };
});

vi.mock('@/shared/lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('@/shared/lib/sse/event-emitter', () => ({
  raceEventEmitter: { emit: vi.fn() },
  RACE_EVENTS: { ODDS_UPDATED: 'ODDS_UPDATED' },
}));

vi.mock('@/shared/db/schema', () => ({
  betGroups: { id: 'betGroups.id' },
  bets: { id: 'bets.id', raceId: 'bets.raceId', details: 'bets.details' },
  raceInstances: { id: 'raceInstances.id', status: 'status' },
  events: { id: 'events.id', status: 'events.status' },
  raceEntries: { raceId: 'raceEntries.raceId' },
  raceOdds: { raceId: 'raceOdds.raceId' },
  transactions: {},
  wallets: { id: 'wallets.id', balance: 'wallets.balance' },
}));

describe('placeBets', () => {
  const userId = 'user-123';
  const raceId = 'race-456';
  const walletId = 'wallet-789';
  const eventId = 'event-abc';

  const mockRace = {
    id: raceId,
    status: 'SCHEDULED',
    closingAt: null,
    eventId,
  };

  const mockWallet = {
    id: walletId,
    userId,
    eventId,
    balance: 10000,
  };

  const defaultArgs = {
    raceId,
    walletId,
    betType: 'win' as const,
    combinations: [[1], [2]],
    amountPerBet: 100,
  };

  const createMockTx = () => {
    const insertReturning = vi.fn().mockResolvedValue([{ id: 'bet-1' }]);
    const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
    const insertChain = { values: insertValues, returning: insertReturning };

    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    const updateChain = { set: updateSet, where: updateWhere };

    return {
      execute: vi.fn().mockResolvedValue(undefined),
      query: {
        raceInstances: { findFirst: vi.fn().mockResolvedValue(mockRace) },
        wallets: { findFirst: vi.fn().mockResolvedValue(mockWallet) },
      },
      insert: vi.fn().mockReturnValue(insertChain),
      update: vi.fn().mockReturnValue(updateChain),
      _insertChain: insertChain,
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
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue(mockRace);
    (db.query.events.findFirst as unknown as Mock).mockResolvedValue({ id: eventId, status: 'ACTIVE' });
    (db.query.wallets.findFirst as unknown as Mock).mockResolvedValue(mockWallet);
    (db.query.raceEntries.findMany as unknown as Mock).mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({
        horseNumber: i + 1,
        bracketNumber: i + 1,
        status: 'ENTRANT',
      }))
    );
  });

  it('ユーザー認証がない場合はエラーをスローする', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockRejectedValue(new ActionError(ADMIN_ERRORS.UNAUTHORIZED));

    await expect(placeBets(defaultArgs)).resolves.toEqual({ success: false, error: ADMIN_ERRORS.UNAUTHORIZED });
  });

  it('組み合わせが空の場合は INVALID_INPUT エラーをスローする', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });

    await expect(placeBets({ ...defaultArgs, combinations: [] })).resolves.toEqual({
      success: false,
      error: ADMIN_ERRORS.INVALID_INPUT,
    });
  });

  it('賭け金額が 0 以下の場合は INVALID_AMOUNT エラーをスローする', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });

    await expect(placeBets({ ...defaultArgs, amountPerBet: 0 })).resolves.toEqual({
      success: false,
      error: ADMIN_ERRORS.INVALID_AMOUNT,
    });
  });

  it('賭け金額が 100 の倍数でない場合は INVALID_AMOUNT エラーをスローする', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });

    await expect(placeBets({ ...defaultArgs, amountPerBet: 150 })).resolves.toEqual({
      success: false,
      error: ADMIN_ERRORS.INVALID_AMOUNT,
    });
  });

  it('組み合わせ数が上限（1000）を超える場合は INVALID_INPUT エラーをスローする', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });

    const tooManyCombinations = Array.from({ length: 1001 }, (_, i) => [i + 1]);
    await expect(placeBets({ ...defaultArgs, combinations: tooManyCombinations })).resolves.toEqual({
      success: false,
      error: ADMIN_ERRORS.INVALID_INPUT,
    });
  });

  it('券種と要素数が一致しない組み合わせは INVALID_INPUT エラーをスローする', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });

    await expect(placeBets({ ...defaultArgs, betType: 'win', combinations: [[1, 2]] })).resolves.toEqual({
      success: false,
      error: ADMIN_ERRORS.INVALID_INPUT,
    });
  });

  it('整数以外を含む組み合わせは INVALID_INPUT エラーをスローする', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });

    await expect(placeBets({ ...defaultArgs, combinations: [[1.5]] })).resolves.toEqual({
      success: false,
      error: ADMIN_ERRORS.INVALID_INPUT,
    });
  });

  it('出走馬に存在しない馬番を含む組み合わせは INVALID_INPUT エラーをスローする', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });

    await expect(placeBets({ ...defaultArgs, combinations: [[99]] })).resolves.toEqual({
      success: false,
      error: ADMIN_ERRORS.INVALID_INPUT,
    });
  });

  it('馬連で同一馬番の重複を含む組み合わせは INVALID_INPUT エラーをスローする', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });

    await expect(placeBets({ ...defaultArgs, betType: 'quinella', combinations: [[1, 1]] })).resolves.toEqual({
      success: false,
      error: ADMIN_ERRORS.INVALID_INPUT,
    });
  });

  it('枠連のゾロ目は同一枠に出走中が2頭以上いる場合のみ許容する', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });
    (db.query.raceEntries.findMany as unknown as Mock).mockResolvedValue([
      { horseNumber: 1, bracketNumber: 1, status: 'ENTRANT' },
      { horseNumber: 2, bracketNumber: 1, status: 'ENTRANT' },
      ...Array.from({ length: 6 }, (_, i) => ({ horseNumber: i + 3, bracketNumber: i + 2, status: 'ENTRANT' })),
    ]);

    await expect(
      placeBets({ ...defaultArgs, betType: 'bracket_quinella', combinations: [[1, 1]] })
    ).resolves.toMatchObject({ success: true });
  });

  it('枠連のゾロ目は枠内の出走中が1頭（取消で頭数割れ）なら拒否する', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });
    (db.query.raceEntries.findMany as unknown as Mock).mockResolvedValue([
      { horseNumber: 1, bracketNumber: 1, status: 'ENTRANT' },
      { horseNumber: 2, bracketNumber: 1, status: 'SCRATCHED' },
      ...Array.from({ length: 6 }, (_, i) => ({ horseNumber: i + 3, bracketNumber: i + 2, status: 'ENTRANT' })),
    ]);

    await expect(placeBets({ ...defaultArgs, betType: 'bracket_quinella', combinations: [[1, 1]] })).resolves.toEqual({
      success: false,
      error: ADMIN_ERRORS.INVALID_INPUT,
    });
  });

  it('イベントが ACTIVE でない場合はエラーをスローする', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });
    (db.query.events.findFirst as unknown as Mock).mockResolvedValue({ id: eventId, status: 'COMPLETED' });

    await expect(placeBets(defaultArgs)).resolves.toEqual({ success: false, error: ADMIN_ERRORS.RACE_CLOSED });
  });

  it('レースが存在しない場合は NOT_FOUND エラーをスローする', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue(null);

    await expect(placeBets(defaultArgs)).resolves.toEqual({ success: false, error: ADMIN_ERRORS.NOT_FOUND });
  });

  it('レースが SCHEDULED 以外の場合は RACE_CLOSED エラーをスローする', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue({ ...mockRace, status: 'CLOSED' });

    await expect(placeBets(defaultArgs)).resolves.toEqual({ success: false, error: ADMIN_ERRORS.RACE_CLOSED });
  });

  it('締切時刻を超えている場合は DEADLINE_EXCEEDED エラーをスローする', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue({
      ...mockRace,
      closingAt: new Date(Date.now() - 1000),
    });

    await expect(placeBets(defaultArgs)).resolves.toEqual({ success: false, error: ADMIN_ERRORS.DEADLINE_EXCEEDED });
  });

  it('トランザクション内で advisory lock を取得する', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });

    await placeBets(defaultArgs);

    expect(mockTx.execute).toHaveBeenCalledTimes(2);
    const lockArg = JSON.stringify(mockTx.execute.mock.calls[0][0]);
    expect(lockArg).toContain('pg_advisory_xact_lock');
    const shareLockArg = JSON.stringify(mockTx.execute.mock.calls[1][0]);
    expect(shareLockArg).toContain('FOR SHARE');
  });

  it('advisory lock のキーに walletId が含まれる', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });

    await placeBets(defaultArgs);

    const lockArg = JSON.stringify(mockTx.execute.mock.calls[0][0]);
    expect(lockArg).toContain(walletId);
  });

  it('ロック取得後にトランザクション内でレースとウォレットを再読み込みする（競合対策）', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });

    const callOrder: string[] = [];
    mockTx.execute.mockImplementation(async () => {
      callOrder.push('lock');
    });
    mockTx.query.raceInstances.findFirst.mockImplementation(async () => {
      callOrder.push('readRace');
      return mockRace;
    });
    mockTx.query.wallets.findFirst.mockImplementation(async () => {
      callOrder.push('readWallet');
      return mockWallet;
    });

    await placeBets(defaultArgs);

    // execute は advisory lock と FOR SHARE の2回。どちらも再読込より先に走ること
    expect(callOrder[0]).toBe('lock');
    expect(callOrder[1]).toBe('lock');
    expect(callOrder[2]).toBe('readRace');
    expect(callOrder[3]).toBe('readWallet');
  });

  it('ロック後にレースが CLOSED になっていた場合は RACE_CLOSED エラーをスローする（競合シナリオ）', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });
    mockTx.query.raceInstances.findFirst.mockResolvedValue({ ...mockRace, status: 'CLOSED' });

    await expect(placeBets(defaultArgs)).resolves.toEqual({ success: false, error: ADMIN_ERRORS.RACE_CLOSED });
  });

  it('ロック後にレースの締切時刻を超えていた場合は DEADLINE_EXCEEDED エラーをスローする（競合シナリオ）', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });
    mockTx.query.raceInstances.findFirst.mockResolvedValue({
      ...mockRace,
      closingAt: new Date(Date.now() - 1000),
    });

    await expect(placeBets(defaultArgs)).resolves.toEqual({ success: false, error: ADMIN_ERRORS.DEADLINE_EXCEEDED });
  });

  it('トランザクション内の残高チェックで不足の場合は INSUFFICIENT_BALANCE エラーをスローする（競合シナリオ）', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });
    (db.query.wallets.findFirst as unknown as Mock).mockResolvedValue({ ...mockWallet, balance: 10000 });
    mockTx.query.wallets.findFirst.mockResolvedValue({ ...mockWallet, balance: 50 });

    await expect(placeBets(defaultArgs)).resolves.toEqual({ success: false, error: ADMIN_ERRORS.INSUFFICIENT_BALANCE });
  });

  it('残高が十分な場合はウォレットが正しく減算される', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });

    await placeBets(defaultArgs);

    expect(mockTx.update).toHaveBeenCalled();
    expect(mockTx.insert).toHaveBeenCalled();
  });

  it('lockedWallet が null の場合は INSUFFICIENT_BALANCE エラーをスローする', async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });
    mockTx.query.wallets.findFirst.mockResolvedValue(null);

    await expect(placeBets(defaultArgs)).resolves.toEqual({ success: false, error: ADMIN_ERRORS.INSUFFICIENT_BALANCE });
  });
});

describe('getUserBetGroupsForRace', () => {
  const userId = 'user-123';
  const raceId = 'race-456';

  const setupAuth = async () => {
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SCHEDULED レースではオッズ付与なしでグループを返す', async () => {
    await setupAuth();
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue({ status: 'SCHEDULED' });
    (db.query.betGroups.findMany as unknown as Mock).mockResolvedValue([
      {
        id: 'bg1',
        type: 'win',
        totalAmount: 200,
        createdAt: new Date(),
        bets: [
          {
            id: 'b1',
            details: { type: 'win', selections: [1] },
            amount: 100,
            status: 'PENDING',
            odds: null,
            race: { entries: [{ horseNumber: 1, horse: { name: 'Horse1' } }] },
          },
        ],
      },
    ]);

    const result = await getUserBetGroupsForRace(raceId);

    expect(result).toHaveLength(1);
    expect(result[0].bets[0].odds).toBeNull();
  });

  it('CLOSED レースでは想定オッズが付与される', async () => {
    await setupAuth();
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue({
      status: 'CLOSED',
      guaranteedOdds: null,
      fixedOddsMode: false,
    });
    (db.query.betGroups.findMany as unknown as Mock).mockResolvedValue([
      {
        id: 'bg1',
        type: 'win',
        totalAmount: 200,
        createdAt: new Date(),
        bets: [
          {
            id: 'b1',
            details: { type: 'win', selections: [1] },
            amount: 100,
            status: 'PENDING',
            odds: null,
            race: { entries: [{ horseNumber: 1, horse: { name: 'Horse1' } }] },
          },
        ],
      },
    ]);
    (db.query.bets.findMany as unknown as Mock).mockResolvedValue([
      { amount: 100, details: { type: 'win', selections: [1] } },
      { amount: 100, details: { type: 'win', selections: [2] } },
    ]);
    (db.query.raceEntries.findMany as unknown as Mock).mockResolvedValue([]);
    const result = await getUserBetGroupsForRace(raceId);

    expect(result).toHaveLength(1);
    expect(result[0].bets[0].odds).toBeDefined();
    expect(result[0].bets[0].odds).toEqual(expect.any(String));
  });

  it('FINALIZED レースではオッズ付与なしでグループを返す', async () => {
    await setupAuth();
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue({ status: 'FINALIZED' });
    (db.query.betGroups.findMany as unknown as Mock).mockResolvedValue([
      {
        id: 'bg1',
        type: 'win',
        totalAmount: 100,
        createdAt: new Date(),
        bets: [
          {
            id: 'b1',
            details: { type: 'win', selections: [1] },
            amount: 100,
            status: 'HIT',
            odds: '2.5',
            race: { entries: [{ horseNumber: 1, horse: { name: 'Horse1' } }] },
          },
        ],
      },
    ]);

    const result = await getUserBetGroupsForRace(raceId);

    expect(result).toHaveLength(1);
    expect(result[0].bets[0].odds).toBe('2.5');
  });

  it('ベットグループが空の場合は空配列を返す', async () => {
    await setupAuth();
    (db.query.raceInstances.findFirst as unknown as Mock).mockResolvedValue({ status: 'SCHEDULED' });
    (db.query.betGroups.findMany as unknown as Mock).mockResolvedValue([]);

    const result = await getUserBetGroupsForRace(raceId);
    expect(result).toEqual([]);
  });
});
