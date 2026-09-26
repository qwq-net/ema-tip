import { db } from '@/shared/db';
import { events } from '@/shared/db/schema';
import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteEvent } from './delete';

vi.mock('@/shared/utils/admin', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/utils/admin')>();
  return { ...original, requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin-1', name: '管理者' } }) };
});
vi.mock('@/shared/utils/admin-audit', () => ({ logAdminAction: vi.fn() }));
vi.mock('@/shared/db', () => ({ db: { transaction: vi.fn() } }));

const event = { id: 'event-1', name: 'テスト開催', carryoverAmount: 0 };
const tx = {
  execute: vi.fn(),
  query: {
    events: { findFirst: vi.fn() },
    raceInstances: { findMany: vi.fn() },
    bet5Events: { findFirst: vi.fn() },
    betGroups: { findFirst: vi.fn() },
    bet5Tickets: { findFirst: vi.fn() },
  },
  delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
  insert: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));
  tx.query.events.findFirst.mockResolvedValue(event);
  tx.query.raceInstances.findMany.mockResolvedValue([{ id: 'race-1' }]);
  tx.query.bet5Events.findFirst.mockResolvedValue({ id: 'bet5-1' });
  tx.query.betGroups.findFirst.mockResolvedValue(undefined);
  tx.query.bet5Tickets.findFirst.mockResolvedValue(undefined);
});

describe('deleteEvent', () => {
  it('通常馬券が購入済みならイベントを削除しない', async () => {
    tx.query.betGroups.findFirst.mockResolvedValue({ id: 'bet-1' });
    const result = await deleteEvent(event.id);
    expect(result).toEqual({ success: false, error: expect.stringContaining('購入') });
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it('BET5が購入済みならイベントを削除しない', async () => {
    tx.query.bet5Tickets.findFirst.mockResolvedValue({ id: 'ticket-1' });
    const result = await deleteEvent(event.id);
    expect(result).toEqual({ success: false, error: expect.stringContaining('購入') });
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it('購入ゼロなら繰越金を残る最新イベントへ移して削除する', async () => {
    tx.query.events.findFirst
      .mockResolvedValueOnce({ ...event, carryoverAmount: 500 })
      .mockResolvedValueOnce({ id: 'event-remaining' });
    const result = await deleteEvent(event.id);
    expect(result).toEqual({ success: true, data: undefined });
    expect(tx.update).toHaveBeenCalledWith(events);
    expect(tx.delete).toHaveBeenCalledTimes(2);
  });

  it('最後のイベントも購入ゼロなら削除する', async () => {
    tx.query.events.findFirst
      .mockResolvedValueOnce({ ...event, carryoverAmount: 500 })
      .mockResolvedValueOnce(undefined);
    const result = await deleteEvent(event.id);
    expect(result).toEqual({ success: true, data: undefined });
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.delete).toHaveBeenCalledTimes(2);
  });

  it('購入がなければBET5設定を先に消してからイベントを削除する', async () => {
    const result = await deleteEvent(event.id);
    expect(result).toEqual({ success: true, data: undefined });
    expect(tx.delete).toHaveBeenCalledTimes(2);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/events');
  });
});
