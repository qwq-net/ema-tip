import { type BetType } from '@/entities/bet';
import { db } from '@/shared/db';
import {
  betGroups,
  bets,
  events,
  payoutResults,
  raceEntries,
  raceInstances,
  transactions,
  wallets,
} from '@/shared/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { finalizePayout } from './payout';

const runSlowTests = process.env.RUN_SLOW_TESTS === '1';
const itSlow = runSlowTests ? it : it.skip;

vi.mock('@/shared/utils/admin', () => ({
  requireAdmin: vi.fn(),
  revalidateRacePaths: vi.fn(),
  ADMIN_ERRORS: {
    NOT_FOUND: 'NOT_FOUND',
  },
}));

vi.mock('@/shared/lib/sse/event-emitter', () => ({
  raceEventEmitter: {
    emit: vi.fn(),
  },
  RACE_EVENTS: {
    RACE_BROADCAST: 'RACE_BROADCAST',
  },
}));

describe('finalizePayout', () => {
  let testUserId: string;
  let eventId: string;
  let venueId: string;
  let raceId: string;
  let walletId: string;
  let horseIds: string[];

  const createdBetGroupIds: string[] = [];
  const createdBetIds: string[] = [];

  beforeEach(async () => {
    const user = await db.query.users.findFirst();
    if (!user) throw new Error('No user found');
    testUserId = user.id;

    const venue = await db.query.venues.findFirst();
    if (!venue) throw new Error('No venue found');
    venueId = venue.id;

    const horses = await db.query.horses.findMany({ columns: { id: true } });
    if (horses.length < 3) throw new Error('At least 3 horses are required for payout tests');
    horseIds = horses.map((horse) => horse.id);

    const [event] = await db
      .insert(events)
      .values({
        name: 'Test Event',
        distributeAmount: 10000,
        date: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
      })
      .returning();
    eventId = event.id;

    const [wallet] = await db
      .insert(wallets)
      .values({
        userId: testUserId,
        eventId: eventId,
        balance: 10000,
      })
      .returning();
    walletId = wallet.id;

    const [race] = await db
      .insert(raceInstances)
      .values({
        eventId: eventId,
        venueId: venueId,
        name: 'Test Race',
        date: new Date().toISOString().split('T')[0],
        distance: 2000,
        surface: 'TURF',
        status: 'CLOSED',
      })
      .returning();
    raceId = race.id;

    createdBetGroupIds.length = 0;
    createdBetIds.length = 0;
  });

  afterEach(async () => {
    for (const betId of createdBetIds) {
      await db.delete(transactions).where(eq(transactions.referenceId, betId));
    }
    for (const betId of createdBetIds) {
      await db.delete(bets).where(eq(bets.id, betId));
    }
    for (const groupId of createdBetGroupIds) {
      await db.delete(betGroups).where(eq(betGroups.id, groupId));
    }
    if (raceId) {
      await db.delete(payoutResults).where(eq(payoutResults.raceId, raceId));
      await db.delete(raceInstances).where(eq(raceInstances.id, raceId));
    }
    if (walletId) {
      await db.delete(wallets).where(eq(wallets.id, walletId));
    }
    if (eventId) {
      await db.delete(events).where(eq(events.id, eventId));
    }
  });

  async function createBet(params: {
    type: BetType;
    selections: number[];
    amount: number;
    userId?: string;
    walletIdOverride?: string;
  }) {
    const uid = params.userId ?? testUserId;
    const wid = params.walletIdOverride ?? walletId;

    const [betGroup] = await db
      .insert(betGroups)
      .values({
        userId: uid,
        raceId: raceId,
        walletId: wid,
        type: params.type,
        totalAmount: params.amount,
      })
      .returning();
    createdBetGroupIds.push(betGroup.id);

    const [bet] = await db
      .insert(bets)
      .values({
        userId: uid,
        raceId: raceId,
        walletId: wid,
        betGroupId: betGroup.id,
        details: { type: params.type, selections: params.selections },
        amount: params.amount,
        status: 'PENDING',
      })
      .returning();
    createdBetIds.push(bet.id);

    return { betGroup, bet };
  }

  async function createBulkBets(params: {
    type: BetType;
    selections: number[];
    amount: number;
    count: number;
    userId?: string;
    walletIdOverride?: string;
  }) {
    const uid = params.userId ?? testUserId;
    const wid = params.walletIdOverride ?? walletId;

    const groupValues = Array.from({ length: params.count }, () => ({
      userId: uid,
      raceId: raceId,
      walletId: wid,
      type: params.type,
      totalAmount: params.amount,
    }));

    const insertedGroups = await db.insert(betGroups).values(groupValues).returning({ id: betGroups.id });
    createdBetGroupIds.push(...insertedGroups.map((group) => group.id));

    const betValues = insertedGroups.map((group) => ({
      userId: uid,
      raceId: raceId,
      walletId: wid,
      betGroupId: group.id,
      details: { type: params.type, selections: params.selections },
      amount: params.amount,
      status: 'PENDING' as const,
    }));

    const insertedBets = await db.insert(bets).values(betValues).returning({ id: bets.id });
    createdBetIds.push(...insertedBets.map((bet) => bet.id));

    return insertedBets;
  }

  it('単勝: 的中・不的中の判定、オッズ計算、ウォレット更新が正しく行われる', async () => {
    const { bet: betWin } = await createBet({ type: 'win', selections: [1], amount: 100 });
    const { bet: betLose } = await createBet({ type: 'win', selections: [2], amount: 100 });

    await db.insert(payoutResults).values({
      raceId: raceId,
      type: 'win',
      combinations: [{ numbers: [1], payout: 250 }],
    });

    await finalizePayout(raceId);

    const updatedBetWin = await db.query.bets.findFirst({ where: eq(bets.id, betWin.id) });
    const updatedBetLose = await db.query.bets.findFirst({ where: eq(bets.id, betLose.id) });
    const updatedWallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });
    const updatedRace = await db.query.raceInstances.findFirst({ where: eq(raceInstances.id, raceId) });

    expect(updatedBetWin?.status).toBe('HIT');
    expect(Number(updatedBetWin?.payout)).toBe(250);
    expect(updatedBetWin?.odds).toBe('2.5');

    expect(updatedBetLose?.status).toBe('LOST');
    expect(Number(updatedBetLose?.payout)).toBe(0);

    expect(Number(updatedWallet?.balance)).toBe(10250);
    expect(updatedRace?.status).toBe('FINALIZED');
  });

  it('処理済み（PENDING以外）のベットは再処理されず、二重払戻が発生しない', async () => {
    const { bet: processedBet } = await createBet({ type: 'win', selections: [1], amount: 100 });
    await db.update(bets).set({ status: 'HIT', payout: 250, odds: '2.5' }).where(eq(bets.id, processedBet.id));

    const { bet: pendingBet } = await createBet({ type: 'win', selections: [1], amount: 100 });

    await db.insert(payoutResults).values({
      raceId: raceId,
      type: 'win',
      combinations: [{ numbers: [1], payout: 250 }],
    });

    await finalizePayout(raceId);

    const updatedPending = await db.query.bets.findFirst({ where: eq(bets.id, pendingBet.id) });
    const updatedWallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });

    expect(updatedPending?.status).toBe('HIT');
    expect(Number(updatedWallet?.balance)).toBe(10250);
  });

  it('馬連: 順不同で的中判定が正しく行われる', async () => {
    const { bet: betHit } = await createBet({ type: 'quinella', selections: [2, 1], amount: 200 });
    const { bet: betMiss } = await createBet({ type: 'quinella', selections: [1, 3], amount: 200 });

    await db.insert(payoutResults).values({
      raceId: raceId,
      type: 'quinella',
      combinations: [{ numbers: [1, 2], payout: 1500 }],
    });

    await finalizePayout(raceId);

    const updatedHit = await db.query.bets.findFirst({ where: eq(bets.id, betHit.id) });
    const updatedMiss = await db.query.bets.findFirst({ where: eq(bets.id, betMiss.id) });
    const updatedWallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });

    expect(updatedHit?.status).toBe('HIT');
    expect(Number(updatedHit?.payout)).toBe(3000);
    expect(updatedHit?.odds).toBe('15.0');

    expect(updatedMiss?.status).toBe('LOST');
    expect(Number(updatedMiss?.payout)).toBe(0);

    expect(Number(updatedWallet?.balance)).toBe(13000);
  });

  it('3連単: 着順通りの場合のみ的中し、高オッズが適用される', async () => {
    const { bet: betHit } = await createBet({ type: 'trifecta', selections: [1, 2, 3], amount: 100 });
    const { bet: betMiss } = await createBet({ type: 'trifecta', selections: [1, 3, 2], amount: 100 });

    await db.insert(payoutResults).values({
      raceId: raceId,
      type: 'trifecta',
      combinations: [{ numbers: [1, 2, 3], payout: 20000 }],
    });

    await finalizePayout(raceId);

    const updatedHit = await db.query.bets.findFirst({ where: eq(bets.id, betHit.id) });
    const updatedMiss = await db.query.bets.findFirst({ where: eq(bets.id, betMiss.id) });
    const updatedWallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });

    expect(updatedHit?.status).toBe('HIT');
    expect(Number(updatedHit?.payout)).toBe(20000);
    expect(updatedHit?.odds).toBe('200.0');

    expect(updatedMiss?.status).toBe('LOST');

    expect(Number(updatedWallet?.balance)).toBe(30000);
  });

  it('全員ハズレの場合: 全ベットが LOST、ウォレットは変化なし', async () => {
    const { bet: bet1 } = await createBet({ type: 'win', selections: [4], amount: 300 });
    const { bet: bet2 } = await createBet({ type: 'win', selections: [5], amount: 200 });

    await db.insert(payoutResults).values({
      raceId: raceId,
      type: 'win',
      combinations: [{ numbers: [1], payout: 350 }],
    });

    await finalizePayout(raceId);

    const updatedBet1 = await db.query.bets.findFirst({ where: eq(bets.id, bet1.id) });
    const updatedBet2 = await db.query.bets.findFirst({ where: eq(bets.id, bet2.id) });
    const updatedWallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });
    const updatedRace = await db.query.raceInstances.findFirst({ where: eq(raceInstances.id, raceId) });

    expect(updatedBet1?.status).toBe('LOST');
    expect(updatedBet2?.status).toBe('LOST');
    expect(Number(updatedBet1?.payout)).toBe(0);
    expect(Number(updatedBet2?.payout)).toBe(0);
    expect(Number(updatedWallet?.balance)).toBe(10000);
    expect(updatedRace?.status).toBe('FINALIZED');
  });

  it('賭けがないレース: ベット処理なしでFINALIZEDに更新される', async () => {
    await db.insert(payoutResults).values({
      raceId: raceId,
      type: 'win',
      combinations: [{ numbers: [1], payout: 350 }],
    });

    await finalizePayout(raceId);

    const updatedRace = await db.query.raceInstances.findFirst({ where: eq(raceInstances.id, raceId) });
    const updatedWallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });

    expect(updatedRace?.status).toBe('FINALIZED');
    expect(Number(updatedWallet?.balance)).toBe(10000);
  });

  it('的中した馬券にはPAYOUTトランザクションが記録される', async () => {
    const { bet: betWin } = await createBet({ type: 'win', selections: [1], amount: 100 });

    await db.insert(payoutResults).values({
      raceId: raceId,
      type: 'win',
      combinations: [{ numbers: [1], payout: 500 }],
    });

    await finalizePayout(raceId);

    const txRecord = await db.query.transactions.findFirst({
      where: eq(transactions.referenceId, betWin.id),
    });

    expect(txRecord).toBeDefined();
    expect(txRecord?.type).toBe('PAYOUT');
    expect(Number(txRecord?.amount)).toBe(500);
    expect(txRecord?.walletId).toBe(walletId);
  });

  it('既にFINALIZED済みのレースはエラーになる', async () => {
    await db.update(raceInstances).set({ status: 'FINALIZED' }).where(eq(raceInstances.id, raceId));
    await expect(finalizePayout(raceId)).rejects.toThrow('すでに払戻確定済みです');
  });

  it('SCHEDULED状態のレースは払戻確定できない', async () => {
    await db.update(raceInstances).set({ status: 'SCHEDULED' }).where(eq(raceInstances.id, raceId));
    await expect(finalizePayout(raceId)).rejects.toThrow('レースが締切状態ではありません');
  });

  it('CANCELLED状態のレースは払戻確定できない', async () => {
    await db.update(raceInstances).set({ status: 'CANCELLED' }).where(eq(raceInstances.id, raceId));
    await expect(finalizePayout(raceId)).rejects.toThrow('レースが締切状態ではありません');
  });

  it('存在しないレースIDではエラーになる', async () => {
    await expect(finalizePayout('00000000-0000-0000-0000-000000000000')).rejects.toThrow();
  });

  it('払戻計算結果がない場合はエラーになる', async () => {
    await expect(finalizePayout(raceId)).rejects.toThrow('払戻計算結果が存在しません');
  });

  it('ワイド: 複数の的中組み合わせが正しく処理される', async () => {
    const { bet: betWide12 } = await createBet({ type: 'wide', selections: [1, 2], amount: 100 });
    const { bet: betWide23 } = await createBet({ type: 'wide', selections: [2, 3], amount: 100 });
    const { bet: betWide14 } = await createBet({ type: 'wide', selections: [1, 4], amount: 100 });

    await db.insert(payoutResults).values({
      raceId: raceId,
      type: 'wide',
      combinations: [
        { numbers: [1, 2], payout: 300 },
        { numbers: [1, 3], payout: 500 },
        { numbers: [2, 3], payout: 800 },
      ],
    });

    await finalizePayout(raceId);

    const updated12 = await db.query.bets.findFirst({ where: eq(bets.id, betWide12.id) });
    const updated23 = await db.query.bets.findFirst({ where: eq(bets.id, betWide23.id) });
    const updated14 = await db.query.bets.findFirst({ where: eq(bets.id, betWide14.id) });
    const updatedWallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });

    expect(updated12?.status).toBe('HIT');
    expect(Number(updated12?.payout)).toBe(300);
    expect(updated12?.odds).toBe('3.0');

    expect(updated23?.status).toBe('HIT');
    expect(Number(updated23?.payout)).toBe(800);
    expect(updated23?.odds).toBe('8.0');

    expect(updated14?.status).toBe('LOST');

    expect(Number(updatedWallet?.balance)).toBe(11100);
  });

  it('取消馬への投票はREFUNDEDとして返還される', async () => {
    await db.insert(raceEntries).values([
      {
        raceId,
        horseId: horseIds[0],
        horseNumber: 1,
        bracketNumber: 1,
        finishPosition: 1,
        status: 'ENTRANT',
      },
      {
        raceId,
        horseId: horseIds[1],
        horseNumber: 4,
        bracketNumber: 4,
        status: 'SCRATCHED',
      },
    ]);

    const { bet: hitBet } = await createBet({ type: 'place', selections: [1], amount: 100 });
    const { bet: refundedBet } = await createBet({ type: 'place', selections: [4], amount: 100 });

    await db.insert(payoutResults).values({
      raceId,
      type: 'place',
      combinations: [{ numbers: [1], payout: 100 }],
    });

    await finalizePayout(raceId);

    const updatedHit = await db.query.bets.findFirst({ where: eq(bets.id, hitBet.id) });
    const updatedRefunded = await db.query.bets.findFirst({ where: eq(bets.id, refundedBet.id) });
    const wallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });
    const refundTx = await db.query.transactions.findFirst({ where: eq(transactions.referenceId, refundedBet.id) });

    expect(updatedHit?.status).toBe('HIT');
    expect(updatedRefunded?.status).toBe('REFUNDED');
    expect(Number(updatedRefunded?.payout)).toBe(100);
    expect(updatedRefunded?.odds).toBe('1.0');
    expect(Number(wallet?.balance)).toBe(10200);
    expect(refundTx?.type).toBe('REFUND');
  });

  it('的中なし券種の売上のみキャリーオーバーに加算される', async () => {
    const { bet: winHitBet } = await createBet({ type: 'win', selections: [1], amount: 100 });
    await createBet({ type: 'wide', selections: [1, 4], amount: 300 });

    await db.insert(payoutResults).values([
      {
        raceId,
        type: 'win',
        combinations: [{ numbers: [1], payout: 200 }],
      },
      {
        raceId,
        type: 'wide',
        combinations: [{ numbers: [1, 2], payout: 300 }],
      },
    ]);

    await finalizePayout(raceId);

    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
    const wallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });
    const winTx = await db.query.transactions.findFirst({ where: eq(transactions.referenceId, winHitBet.id) });

    expect(Number(event?.carryoverAmount)).toBe(300);
    expect(Number(wallet?.balance)).toBe(10200);
    expect(winTx?.type).toBe('PAYOUT');
    expect(Number(winTx?.amount)).toBe(200);
  });

  it('返還馬券はキャリーオーバー計算の売上に含まれない', async () => {
    await db.insert(raceEntries).values([
      {
        raceId,
        horseId: horseIds[0],
        horseNumber: 1,
        bracketNumber: 1,
        status: 'ENTRANT',
      },
      {
        raceId,
        horseId: horseIds[1],
        horseNumber: 4,
        bracketNumber: 4,
        status: 'SCRATCHED',
      },
    ]);

    const { bet: refundedBet } = await createBet({ type: 'place', selections: [4], amount: 500 });
    await createBet({ type: 'place', selections: [5], amount: 200 });

    await db.insert(payoutResults).values({
      raceId,
      type: 'place',
      combinations: [{ numbers: [1], payout: 100 }],
    });

    await finalizePayout(raceId);

    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
    const wallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });
    const refundTx = await db.query.transactions.findFirst({ where: eq(transactions.referenceId, refundedBet.id) });

    expect(Number(event?.carryoverAmount)).toBe(200);
    expect(Number(wallet?.balance)).toBe(10500);
    expect(refundTx?.type).toBe('REFUND');
    expect(Number(refundTx?.amount)).toBe(500);
  });

  it('枠連の無効枠はREFUNDEDとなり、有効枠の的中はPAYOUTとなる', async () => {
    await db.insert(raceEntries).values([
      {
        raceId,
        horseId: horseIds[0],
        horseNumber: 11,
        bracketNumber: 1,
        status: 'ENTRANT',
      },
      {
        raceId,
        horseId: horseIds[1],
        horseNumber: 22,
        bracketNumber: 2,
        status: 'ENTRANT',
      },
      {
        raceId,
        horseId: horseIds[2],
        horseNumber: 44,
        bracketNumber: 4,
        status: 'SCRATCHED',
      },
    ]);

    const { bet: hitBet } = await createBet({ type: 'bracket_quinella', selections: [1, 2], amount: 100 });
    const { bet: refundedBet } = await createBet({ type: 'bracket_quinella', selections: [1, 4], amount: 300 });

    await db.insert(payoutResults).values({
      raceId,
      type: 'bracket_quinella',
      combinations: [{ numbers: [1, 2], payout: 250 }],
    });

    await finalizePayout(raceId);

    const updatedHit = await db.query.bets.findFirst({ where: eq(bets.id, hitBet.id) });
    const updatedRefunded = await db.query.bets.findFirst({ where: eq(bets.id, refundedBet.id) });
    const wallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });
    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
    const hitTx = await db.query.transactions.findFirst({ where: eq(transactions.referenceId, hitBet.id) });
    const refundTx = await db.query.transactions.findFirst({ where: eq(transactions.referenceId, refundedBet.id) });

    expect(updatedHit?.status).toBe('HIT');
    expect(Number(updatedHit?.payout)).toBe(250);
    expect(updatedHit?.odds).toBe('2.5');

    expect(updatedRefunded?.status).toBe('REFUNDED');
    expect(Number(updatedRefunded?.payout)).toBe(300);
    expect(updatedRefunded?.odds).toBe('1.0');

    expect(Number(wallet?.balance)).toBe(10550);
    expect(Number(event?.carryoverAmount)).toBe(0);
    expect(hitTx?.type).toBe('PAYOUT');
    expect(refundTx?.type).toBe('REFUND');
  });

  it('Netkeiba由来の高額payoutResultsで正しく払戻される', async () => {
    const { bet: betHit } = await createBet({ type: 'trifecta', selections: [1, 2, 3], amount: 100 });
    const { bet: betMiss } = await createBet({ type: 'trifecta', selections: [3, 2, 1], amount: 100 });

    await db.insert(payoutResults).values({
      raceId: raceId,
      type: 'trifecta',
      combinations: [{ numbers: [1, 2, 3], payout: 125600 }],
    });

    await finalizePayout(raceId);

    const updatedHit = await db.query.bets.findFirst({ where: eq(bets.id, betHit.id) });
    const updatedMiss = await db.query.bets.findFirst({ where: eq(bets.id, betMiss.id) });
    const updatedWallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });

    expect(updatedHit?.status).toBe('HIT');
    expect(Number(updatedHit?.payout)).toBe(125600);
    expect(updatedHit?.odds).toBe('1256.0');

    expect(updatedMiss?.status).toBe('LOST');
    expect(Number(updatedMiss?.payout)).toBe(0);

    expect(Number(updatedWallet?.balance)).toBe(10000 + 125600);
  });

  it('Netkeiba由来の複数券種payoutResultsで的中・不的中・キャリーオーバーが正しく処理される', async () => {
    const { bet: winHit } = await createBet({ type: 'win', selections: [1], amount: 200 });
    await createBet({ type: 'win', selections: [2], amount: 200 });
    const { bet: quinellaHit } = await createBet({ type: 'quinella', selections: [2, 1], amount: 100 });
    await createBet({ type: 'exacta', selections: [2, 1], amount: 100 });

    await db.insert(payoutResults).values([
      { raceId, type: 'win', combinations: [{ numbers: [1], payout: 540 }] },
      { raceId, type: 'quinella', combinations: [{ numbers: [1, 2], payout: 1520 }] },
      { raceId, type: 'exacta', combinations: [{ numbers: [1, 2], payout: 2840 }] },
    ]);

    await finalizePayout(raceId);

    const updatedWinHit = await db.query.bets.findFirst({ where: eq(bets.id, winHit.id) });
    expect(updatedWinHit?.status).toBe('HIT');
    expect(Number(updatedWinHit?.payout)).toBe(1080);
    expect(updatedWinHit?.odds).toBe('5.4');

    const updatedQuinellaHit = await db.query.bets.findFirst({ where: eq(bets.id, quinellaHit.id) });
    expect(updatedQuinellaHit?.status).toBe('HIT');
    expect(Number(updatedQuinellaHit?.payout)).toBe(1520);
    expect(updatedQuinellaHit?.odds).toBe('15.2');

    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
    expect(Number(event?.carryoverAmount)).toBe(100);

    const wallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });
    expect(Number(wallet?.balance)).toBe(10000 + 1080 + 1520);
  });

  itSlow('1000件超の大量購入でもバッチ更新とPAYOUT記録が整合する', async () => {
    const hitCount = 1005;
    const loseCount = 205;

    await createBulkBets({ type: 'win', selections: [1], amount: 100, count: hitCount });
    await createBulkBets({ type: 'win', selections: [2], amount: 100, count: loseCount });

    await db.insert(payoutResults).values({
      raceId,
      type: 'win',
      combinations: [{ numbers: [1], payout: 200 }],
    });

    await finalizePayout(raceId);

    const allRaceBets = await db.query.bets.findMany({ where: eq(bets.raceId, raceId) });
    const allTx = await db.query.transactions.findMany({
      where: inArray(transactions.referenceId, createdBetIds),
    });
    const wallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });
    const race = await db.query.raceInstances.findFirst({ where: eq(raceInstances.id, raceId) });
    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });

    const hitBets = allRaceBets.filter((bet) => bet.status === 'HIT');
    const lostBets = allRaceBets.filter((bet) => bet.status === 'LOST');

    expect(hitBets.length).toBe(hitCount);
    expect(lostBets.length).toBe(loseCount);
    expect(allTx.length).toBe(hitCount);
    expect(allTx.every((txRecord) => txRecord.type === 'PAYOUT')).toBe(true);

    expect(Number(wallet?.balance)).toBe(10000 + hitCount * 200);
    expect(race?.status).toBe('FINALIZED');
    expect(Number(event?.carryoverAmount)).toBe(0);
  });

  itSlow('大量かつ複数券種でも的中集計・キャリーオーバー集計が正しい', async () => {
    const perTypeCount = 260;

    await createBulkBets({ type: 'win', selections: [1], amount: 100, count: perTypeCount });
    await createBulkBets({ type: 'place', selections: [9], amount: 100, count: perTypeCount });
    await createBulkBets({ type: 'quinella', selections: [1, 2], amount: 100, count: perTypeCount });
    await createBulkBets({ type: 'wide', selections: [1, 3], amount: 100, count: perTypeCount });
    await createBulkBets({ type: 'trifecta', selections: [1, 2, 3], amount: 100, count: perTypeCount });

    await db.insert(payoutResults).values([
      { raceId, type: 'win', combinations: [{ numbers: [1], payout: 200 }] },
      { raceId, type: 'place', combinations: [{ numbers: [1], payout: 140 }] },
      { raceId, type: 'quinella', combinations: [{ numbers: [1, 2], payout: 300 }] },
      { raceId, type: 'wide', combinations: [{ numbers: [1, 2], payout: 220 }] },
      { raceId, type: 'trifecta', combinations: [{ numbers: [1, 2, 3], payout: 1200 }] },
    ]);

    await finalizePayout(raceId);

    const allRaceBets = await db.query.bets.findMany({ where: eq(bets.raceId, raceId) });
    const allTx = await db.query.transactions.findMany({
      where: inArray(transactions.referenceId, createdBetIds),
    });
    const wallet = await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) });
    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });

    const hitCount = perTypeCount * 3;
    const lostCount = perTypeCount * 2;
    const expectedPayoutTotal = perTypeCount * 200 + perTypeCount * 300 + perTypeCount * 1200;
    const expectedCarryover = perTypeCount * 100 + perTypeCount * 100;

    expect(allRaceBets.filter((bet) => bet.status === 'HIT').length).toBe(hitCount);
    expect(allRaceBets.filter((bet) => bet.status === 'LOST').length).toBe(lostCount);
    expect(allRaceBets.filter((bet) => bet.status === 'REFUNDED').length).toBe(0);

    expect(allTx.length).toBe(hitCount);
    expect(allTx.every((txRecord) => txRecord.type === 'PAYOUT')).toBe(true);

    expect(Number(wallet?.balance)).toBe(10000 + expectedPayoutTotal);
    expect(Number(event?.carryoverAmount)).toBe(expectedCarryover);
  });
});
