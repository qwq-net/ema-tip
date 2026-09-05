import { db } from '@/shared/db';
import { betGroups, bets, events, raceEntries, raceInstances, transactions, wallets } from '@/shared/db/schema';
import { ADMIN_ERRORS } from '@/shared/utils/admin';
import { eq } from 'drizzle-orm';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { placeBets } from './actions';

// 実 DB で advisory lock と FOR SHARE の直列化を検証する。モックでは呼び出し順しか確かめられない
vi.mock('@/shared/utils/admin', async () => {
  const actual = await vi.importActual('@/shared/utils/admin');
  return { ...actual, requireUser: vi.fn() };
});

// オッズ再計算は購入の応答を待たずに走り、後片付けで消したレースへ書き込もうとする。
// 計算内容は odds.test.ts が担うため、ここでは呼ばれない形に差し替える
vi.mock('./logic/odds', () => ({
  calculateOdds: vi.fn().mockResolvedValue(undefined),
  getProvisionalOddsCached: vi.fn(),
}));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('placeBets の DB 整合', () => {
  const HORSE_COUNT = 8;
  let userId: string;
  let eventId: string;
  let raceId: string;
  let walletId: string;

  async function setBalance(balance: number) {
    await db.update(wallets).set({ balance }).where(eq(wallets.id, walletId));
  }

  async function readWalletState() {
    const wallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });
    const groupRows = await db.query.betGroups.findMany({ where: eq(betGroups.raceId, raceId) });
    const betRows = await db.query.bets.findMany({ where: eq(bets.raceId, raceId) });
    const txRows = await db.query.transactions.findMany({ where: eq(transactions.walletId, walletId) });
    return { wallet, groupRows, betRows, txRows };
  }

  beforeEach(async () => {
    const user = await db.query.users.findFirst();
    if (!user) throw new Error('シード済みのユーザーが必要です');
    userId = user.id;
    const { requireUser } = await import('@/shared/utils/admin');
    (requireUser as unknown as Mock).mockResolvedValue({ user: { id: userId } });

    const venue = await db.query.venues.findFirst();
    if (!venue) throw new Error('シード済みの競馬場が必要です');
    const horses = await db.query.horses.findMany({ columns: { id: true }, limit: HORSE_COUNT });
    if (horses.length < HORSE_COUNT) throw new Error(`シード済みの馬が${HORSE_COUNT}頭必要です`);

    const today = new Date().toISOString().slice(0, 10);
    const [event] = await db
      .insert(events)
      .values({ name: 'placeBets 検証イベント', distributeAmount: 10000, date: today, status: 'ACTIVE' })
      .returning();
    eventId = event!.id;

    const [wallet] = await db.insert(wallets).values({ userId, eventId, balance: 10000 }).returning();
    walletId = wallet!.id;

    const [race] = await db
      .insert(raceInstances)
      .values({
        eventId,
        venueId: venue.id,
        name: 'placeBets 検証レース',
        date: today,
        distance: 1600,
        surface: '芝',
        status: 'SCHEDULED',
      })
      .returning();
    raceId = race!.id;

    await db.insert(raceEntries).values(
      horses.map((horse, i) => ({
        raceId,
        horseId: horse.id,
        horseNumber: i + 1,
        bracketNumber: i + 1,
        status: 'ENTRANT' as const,
      }))
    );
  });

  afterEach(async () => {
    // event を消すと race・entries・wallet・bet・bet_group・transaction が外部キーの連鎖で消える
    await db.delete(events).where(eq(events.id, eventId));
  });

  it('購入が成功すると bet_group・bet・transaction・残高が 1 円のずれもなく整合する', async () => {
    const result = await placeBets({
      raceId,
      walletId,
      betType: 'win',
      combinations: [[1], [2], [3]],
      amountPerBet: 200,
    });
    expect(result.success).toBe(true);

    const { wallet, groupRows, betRows, txRows } = await readWalletState();
    expect(wallet?.balance).toBe(10000 - 600);
    expect(groupRows).toHaveLength(1);
    expect(groupRows[0]?.totalAmount).toBe(600);
    expect(betRows).toHaveLength(3);
    expect(betRows.every((bet) => bet.amount === 200 && bet.status === 'PENDING')).toBe(true);
    expect(betRows.flatMap((bet) => bet.details.selections).sort((a, b) => a - b)).toEqual([1, 2, 3]);

    expect(txRows).toHaveLength(3);
    expect(txRows.every((tx) => tx.type === 'BET' && tx.amount === -200)).toBe(true);
    expect(new Set(txRows.map((tx) => tx.referenceId))).toEqual(new Set(betRows.map((bet) => bet.id)));
    const ledgerTotal = txRows.reduce((sum, tx) => sum + tx.amount, 0);
    expect(10000 + ledgerTotal).toBe(wallet?.balance);
  });

  it('残高ちょうどの購入は成功し、残高は 0 になる', async () => {
    await setBalance(300);
    const result = await placeBets({
      raceId,
      walletId,
      betType: 'win',
      combinations: [[1], [2], [3]],
      amountPerBet: 100,
    });
    expect(result.success).toBe(true);
    const { wallet } = await readWalletState();
    expect(wallet?.balance).toBe(0);
  });

  it('同一ウォレットへの同時購入は残高で賄える分だけ成功し、残高がマイナスにならず失敗分の行も残らない', async () => {
    await setBalance(300);
    const args = { raceId, walletId, betType: 'win' as const, combinations: [[1]], amountPerBet: 100 };

    const results = await Promise.all(Array.from({ length: 6 }, () => placeBets(args)));

    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);
    expect(succeeded).toHaveLength(3);
    expect(failed.map((r) => r.error)).toEqual(Array.from({ length: 3 }, () => ADMIN_ERRORS.INSUFFICIENT_BALANCE));

    const { wallet, groupRows, betRows, txRows } = await readWalletState();
    expect(wallet?.balance).toBe(0);
    expect(groupRows).toHaveLength(3);
    expect(betRows).toHaveLength(3);
    expect(txRows).toHaveLength(3);
  });

  it('締切の UPDATE がコミットされるまで購入は待たされ、コミット後は締切済みとして拒否される', async () => {
    let committedAt = 0;
    // 締切トランザクションを開いたまま保持する。行ロックが取られるため購入側の FOR SHARE が待つ
    const closing = db
      .transaction(async (tx) => {
        await tx.update(raceInstances).set({ status: 'CLOSED' }).where(eq(raceInstances.id, raceId));
        await sleep(600);
      })
      .then(() => {
        committedAt = performance.now();
      });
    await sleep(100);

    const result = await placeBets({ raceId, walletId, betType: 'win', combinations: [[1]], amountPerBet: 100 });
    const resolvedAt = performance.now();
    await closing;

    // 事前チェックは未コミットの締切を見ないため通過し、ロック待ちの後に締切を検知して拒否する
    expect(result).toEqual({ success: false, error: ADMIN_ERRORS.RACE_CLOSED });
    expect(resolvedAt).toBeGreaterThanOrEqual(committedAt);

    const { wallet, betRows, groupRows } = await readWalletState();
    expect(wallet?.balance).toBe(10000);
    expect(betRows).toHaveLength(0);
    expect(groupRows).toHaveLength(0);
  });

  it('購入中の FOR SHARE は締切の UPDATE をコミットまで待たせ、締切前に始まった購入だけが残る', async () => {
    // 購入側が FOR SHARE を持つ間に締切を試みる。締切は行ロック待ちで購入のコミット後に通る
    let closedAt = 0;
    const purchase = placeBets({ raceId, walletId, betType: 'win', combinations: [[1]], amountPerBet: 100 }).then(
      (result) => ({ result, at: performance.now() })
    );
    const closing = db
      .update(raceInstances)
      .set({ status: 'CLOSED' })
      .where(eq(raceInstances.id, raceId))
      .then(() => {
        closedAt = performance.now();
      });
    const [{ result }] = await Promise.all([purchase, closing]);

    // 順序はスケジューラ次第だが、どちらの順でも「締切後に新しいベットが増える」ことはない
    const { betRows, wallet } = await readWalletState();
    if (result.success) {
      expect(betRows).toHaveLength(1);
      expect(wallet?.balance).toBe(9900);
    } else {
      expect(result.error).toBe(ADMIN_ERRORS.RACE_CLOSED);
      expect(betRows).toHaveLength(0);
      expect(wallet?.balance).toBe(10000);
    }
    expect(closedAt).toBeGreaterThan(0);
  });

  it('DB の check 制約が残高マイナスへの直接更新を拒否する', async () => {
    // drizzle は失敗クエリを包んで投げるため、制約名は cause 側にある
    const error = await db
      .update(wallets)
      .set({ balance: -1 })
      .where(eq(wallets.id, walletId))
      .then(() => null)
      .catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(Error);
    expect(String((error as Error).cause)).toContain('wallet_balance_non_negative');
    const { wallet } = await readWalletState();
    expect(wallet?.balance).toBe(10000);
  });
});
