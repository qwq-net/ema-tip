import { createBet5Event } from '@/entities/bet/lib/bet5-event';
import { placeBets } from '@/features/betting/actions';
import { placeBet5BetAction } from '@/features/betting/actions/bet5';
import { claimEvent } from '@/features/economy/claim/actions';
import { borrowLoan } from '@/features/economy/loan/actions';
import { getWalletTransactions } from '@/features/economy/wallet/queries';
import { upsertForecast } from '@/features/forecasts/actions';
import { updateUserName } from '@/features/user/actions/user-actions';
import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import {
  bet5Tickets,
  bets,
  events,
  forecasts,
  raceEntries,
  raceInstances,
  transactions,
  users,
  wallets,
} from '@/shared/db/schema';
import { firstRow } from '@/shared/utils/first-row';
import { eq, inArray } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 認証された本人だけ差し替え、ガード・SQLの所有者条件・残高更新は実物で確認する。
vi.mock('@/features/betting/logic/odds', () => ({ calculateOdds: vi.fn(), getProvisionalOddsCached: vi.fn() }));

describe('Server Actionの操作対象と所有者', () => {
  const actorId = crypto.randomUUID();
  const otherId = crypto.randomUUID();
  let eventId: string;
  let otherWalletId: string;
  let raceIds: [string, string, string, string, string];
  let horseId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    await db.insert(users).values([
      { id: actorId, name: '操作本人', role: 'TIPSTER' },
      { id: otherId, name: '別の利用者', role: 'USER' },
    ]);
    vi.mocked(auth).mockResolvedValue({ user: { id: actorId, role: 'TIPSTER' } } as never);
    const event = firstRow(
      await db
        .insert(events)
        .values({
          name: '認可検証',
          date: '2026-11-15',
          distributeAmount: 10000,
          status: 'ACTIVE',
        })
        .returning(),
      'イベント'
    );
    eventId = event.id;
    otherWalletId = firstRow(
      await db.insert(wallets).values({ userId: otherId, eventId, balance: 1000 }).returning(),
      'ウォレット'
    ).id;
    const venue = firstRow(await db.query.venues.findMany({ limit: 1 }), 'シード済み会場');
    horseId = firstRow(await db.query.horses.findMany({ limit: 1 }), 'シード済み馬').id;
    const races = await db
      .insert(raceInstances)
      .values(
        Array.from({ length: 5 }, (_, i) => ({
          eventId,
          venueId: venue.id,
          name: `認可検証${i + 1}`,
          date: '2026-11-15',
          distance: 1600,
          surface: '芝' as const,
        }))
      )
      .returning();
    raceIds = races.map((race) => race.id) as typeof raceIds;
    await db
      .insert(raceEntries)
      .values(races.map((race) => ({ raceId: race.id, horseId, horseNumber: 1, bracketNumber: 1 })));
  });

  afterEach(async () => {
    if (eventId) await db.delete(events).where(eq(events.id, eventId));
    await db.delete(users).where(inArray(users.id, [actorId, otherId]));
  });

  // 拒否時に他人の残高・購入履歴・台帳を一切変更しないことを比較する。
  async function moneyState() {
    return {
      wallets: await db.query.wallets.findMany({ where: eq(wallets.eventId, eventId), orderBy: wallets.id }),
      bets: await db.query.bets.findMany({ where: inArray(bets.raceId, raceIds) }),
      tickets: await db.query.bet5Tickets.findMany({ where: eq(bet5Tickets.userId, otherId) }),
      transactions: await db.query.transactions.findMany({ where: eq(transactions.walletId, otherWalletId) }),
    };
  }

  it('他人のウォレットを指定した購入は残高・馬券・台帳を変更しない', async () => {
    const before = await moneyState();
    expect(
      await placeBets({
        raceId: raceIds[0],
        walletId: otherWalletId,
        betType: 'win',
        combinations: [[1]],
        amountPerBet: 100,
      })
    ).toEqual({ success: false, error: '不正なウォレットです' });
    expect(await moneyState()).toEqual(before);
  });

  it('他人の取引履歴は返さず、本人の履歴は返す', async () => {
    await db
      .insert(transactions)
      .values({ walletId: otherWalletId, type: 'DISTRIBUTION', amount: 1000, referenceId: eventId });
    await expect(getWalletTransactions(otherWalletId)).rejects.toThrow('認証されていません');
    vi.mocked(auth).mockResolvedValue({ user: { id: otherId, role: 'USER' } } as never);
    expect(await getWalletTransactions(otherWalletId)).toHaveLength(1);
  });

  it('他人のウォレットがあっても本人が未参加なら借入できない', async () => {
    const before = await moneyState();
    expect(await borrowLoan(eventId)).toEqual({ success: false, error: 'ウォレットが見つかりません' });
    expect(await moneyState()).toEqual(before);
  });

  it('参加と借入は本人のウォレットだけに反映する', async () => {
    expect((await claimEvent(eventId)).success).toBe(true);
    const ownWallet = firstRow(
      await db.query.wallets.findMany({ where: eq(wallets.userId, actorId) }),
      '本人のウォレット'
    );
    await db.update(wallets).set({ balance: 0 }).where(eq(wallets.id, ownWallet.id));
    expect((await borrowLoan(eventId)).success).toBe(true);
    const updated = await db.query.wallets.findFirst({ where: eq(wallets.id, ownWallet.id) });
    expect(updated).toMatchObject({ balance: 10000, totalLoaned: 10000 });
    expect(await db.query.wallets.findFirst({ where: eq(wallets.id, otherWalletId) })).toMatchObject({
      balance: 1000,
      totalLoaned: 0,
    });
  });

  it('名前変更に他人のIDや管理者ロールを混ぜても本人の名前だけ更新する', async () => {
    const form = new FormData();
    form.set('name', '新しい名前');
    form.set('userId', otherId);
    form.set('role', 'ADMIN');
    expect(await updateUserName(form)).toEqual({ success: true });
    expect(await db.query.users.findFirst({ where: eq(users.id, actorId) })).toMatchObject({
      name: '新しい名前',
      role: 'TIPSTER',
    });
    expect(await db.query.users.findFirst({ where: eq(users.id, otherId) })).toMatchObject({
      name: '別の利用者',
      role: 'USER',
    });
  });

  it.each(['TIPSTER', 'ADMIN'] as const)('%sの予想保存で他人の予想を上書きしない', async (role) => {
    await db.insert(forecasts).values({ raceId: raceIds[0], userId: otherId, selections: {}, comment: '元の予想' });
    vi.mocked(auth).mockResolvedValue({ user: { id: actorId, role } } as never);
    await upsertForecast(raceIds[0], { [horseId]: '◎' }, '本人の予想');
    const rows = await db.query.forecasts.findMany({ where: eq(forecasts.raceId, raceIds[0]) });
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.userId === otherId)?.comment).toBe('元の予想');
    expect(rows.find((row) => row.userId === actorId)?.comment).toBe('本人の予想');
  });

  it('BET5は本人の参加先から支払い、他人のウォレットを使わない', async () => {
    const bet5 = await createBet5Event({ eventId, raceIds, initialPot: 0 });
    const args = {
      bet5EventId: bet5!.id,
      eventId,
      unitAmount: 100,
      selections: {
        race1: [horseId],
        race2: [horseId],
        race3: [horseId],
        race4: [horseId],
        race5: [horseId],
      },
    };
    const before = await moneyState();
    expect(await placeBet5BetAction(args)).toEqual({ success: false, error: 'ウォレットが見つかりません' });
    expect(await moneyState()).toEqual(before);
    expect((await claimEvent(eventId)).success).toBe(true);
    const result = await placeBet5BetAction(args);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error(result.error);
    expect(result.data.userId).toBe(actorId);
    expect(await db.query.wallets.findFirst({ where: eq(wallets.id, result.data.walletId) })).toMatchObject({
      userId: actorId,
      balance: 9900,
    });
    expect(await db.query.wallets.findFirst({ where: eq(wallets.id, otherWalletId) })).toMatchObject({ balance: 1000 });
  });
});
