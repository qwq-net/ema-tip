import { db } from '@/shared/db';
import {
  adminActionLogs,
  bet5Events,
  bet5Tickets,
  betGroups,
  events,
  raceInstances,
  transactions,
  wallets,
} from '@/shared/db/schema';
import { firstRow } from '@/shared/utils/first-row';
import { eq, inArray } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelBet5EventAction } from '../bet5/cancel';
import { deleteRace } from '../manage-races/actions/delete';
import { deleteEvent } from './delete';

vi.mock('@/shared/utils/admin', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/utils/admin')>();
  return { ...original, requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'test-admin', name: 'test-admin' } }) };
});

describe('削除・BET5設定取消のDB整合', () => {
  let eventId = '';
  let walletId = '';
  let userId = '';
  let venueId = '';
  const raceIds: string[] = [];
  const date = '2026-09-27';

  beforeEach(async () => {
    const user = await db.query.users.findFirst({ columns: { id: true } });
    const venue = await db.query.venues.findFirst({ columns: { id: true } });
    if (!user || !venue) throw new Error('結合テストにはユーザーと競馬場のシードが必要です');
    userId = user.id;
    venueId = venue.id;
    const createdEvent = firstRow(
      await db
        .insert(events)
        .values({ name: '削除操作DB検証', distributeAmount: 1000, date, status: 'ACTIVE' })
        .returning({ id: events.id }),
      '検証イベント'
    );
    eventId = createdEvent.id;
    const wallet = firstRow(
      await db.insert(wallets).values({ userId, eventId, balance: 1000 }).returning({ id: wallets.id }),
      '検証ウォレット'
    );
    walletId = wallet.id;
    raceIds.length = 0;
  });

  afterEach(async () => {
    if (eventId) {
      await db.delete(bet5Events).where(eq(bet5Events.eventId, eventId));
      await db.delete(events).where(eq(events.id, eventId));
      await db.delete(adminActionLogs).where(inArray(adminActionLogs.targetId, [eventId, ...raceIds]));
    }
  });

  async function createRaces(count: number) {
    const rows = await db
      .insert(raceInstances)
      .values(
        Array.from({ length: count }, (_, index) => ({
          eventId,
          venueId,
          name: `検証レース${index + 1}`,
          date,
          distance: 1600,
          surface: '芝' as const,
        }))
      )
      .returning({ id: raceInstances.id });
    raceIds.push(...rows.map((row) => row.id));
  }

  async function createBet5() {
    if (raceIds.length < 5) throw new Error('BET5には5レースが必要です');
    return firstRow(
      await db
        .insert(bet5Events)
        .values({
          eventId,
          race1Id: raceIds[0]!,
          race2Id: raceIds[1]!,
          race3Id: raceIds[2]!,
          race4Id: raceIds[3]!,
          race5Id: raceIds[4]!,
        })
        .returning({ id: bet5Events.id }),
      '検証BET5'
    );
  }

  it('配布済みでも購入ゼロなら、BET5設定ごとイベントを削除する', async () => {
    await createRaces(5);
    const bet5 = await createBet5();
    const transaction = firstRow(
      await db
        .insert(transactions)
        .values({ walletId, type: 'DISTRIBUTION', amount: 1000 })
        .returning({ id: transactions.id }),
      '検証取引'
    );

    expect(await deleteEvent(eventId)).toEqual({ success: true, data: undefined });
    expect(await db.query.events.findFirst({ where: eq(events.id, eventId) })).toBeUndefined();
    expect(await db.query.wallets.findFirst({ where: eq(wallets.id, walletId) })).toBeUndefined();
    expect(await db.query.transactions.findFirst({ where: eq(transactions.id, transaction.id) })).toBeUndefined();
    expect(await db.query.bet5Events.findFirst({ where: eq(bet5Events.id, bet5.id) })).toBeUndefined();
  });

  it('通常馬券の購入があればイベントとレースを残す', async () => {
    await createRaces(1);
    await db.insert(betGroups).values({ userId, raceId: raceIds[0]!, walletId, type: 'win', totalAmount: 100 });

    expect((await deleteRace(raceIds[0]!)).success).toBe(false);
    expect((await deleteEvent(eventId)).success).toBe(false);
    expect(await db.query.events.findFirst({ where: eq(events.id, eventId) })).toBeDefined();
    expect(await db.query.raceInstances.findFirst({ where: eq(raceInstances.id, raceIds[0]!) })).toBeDefined();
  });

  it('未購入BET5の設定を取り消すと、対象レースを削除できる', async () => {
    await createRaces(5);
    const bet5 = await createBet5();

    expect((await deleteRace(raceIds[0]!)).success).toBe(false);
    expect(await cancelBet5EventAction(bet5.id, eventId)).toEqual({ success: true, data: undefined });
    expect(await deleteRace(raceIds[0]!)).toEqual({ success: true, data: undefined });
  });

  it('BET5の購入があれば設定もイベントも残す', async () => {
    await createRaces(5);
    const bet5 = await createBet5();
    await db.insert(bet5Tickets).values({
      bet5EventId: bet5.id,
      userId,
      walletId,
      race1HorseIds: [],
      race2HorseIds: [],
      race3HorseIds: [],
      race4HorseIds: [],
      race5HorseIds: [],
      amount: 100,
    });

    expect((await cancelBet5EventAction(bet5.id, eventId)).success).toBe(false);
    expect((await deleteEvent(eventId)).success).toBe(false);
    expect(await db.query.bet5Events.findFirst({ where: eq(bet5Events.id, bet5.id) })).toBeDefined();
  });
});
