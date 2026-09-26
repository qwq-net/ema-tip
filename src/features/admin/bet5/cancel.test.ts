import { db } from '@/shared/db';
import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelBet5EventAction } from './cancel';

vi.mock('@/shared/utils/admin', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/utils/admin')>();
  return { ...original, requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin-1', name: '管理者' } }) };
});
vi.mock('@/shared/utils/admin-audit', () => ({ logAdminAction: vi.fn() }));
vi.mock('@/shared/db', () => ({ db: { transaction: vi.fn() } }));

const tx = {
  execute: vi.fn(),
  query: {
    bet5Events: { findFirst: vi.fn() },
    bet5Tickets: { findFirst: vi.fn() },
  },
  delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  insert: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));
  tx.query.bet5Events.findFirst.mockResolvedValue({ id: 'bet5-1', eventId: 'event-1', status: 'SCHEDULED' });
  tx.query.bet5Tickets.findFirst.mockResolvedValue(undefined);
});

describe('cancelBet5EventAction', () => {
  it('購入済みのBET5は取り消さない', async () => {
    tx.query.bet5Tickets.findFirst.mockResolvedValue({ id: 'ticket-1' });
    const result = await cancelBet5EventAction('bet5-1', 'event-1');
    expect(result).toEqual({ success: false, error: expect.stringContaining('購入') });
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it('払戻確定済みのBET5は取り消さない', async () => {
    tx.query.bet5Events.findFirst.mockResolvedValue({ id: 'bet5-1', eventId: 'event-1', status: 'FINALIZED' });
    const result = await cancelBet5EventAction('bet5-1', 'event-1');
    expect(result).toEqual({ success: false, error: expect.stringContaining('払戻確定') });
  });

  it('未購入なら設定を消し、再設定できる状態へ戻す', async () => {
    const result = await cancelBet5EventAction('bet5-1', 'event-1');
    expect(result).toEqual({ success: true, data: undefined });
    expect(tx.delete).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/events/event-1');
  });
});
