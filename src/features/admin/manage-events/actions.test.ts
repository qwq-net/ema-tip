import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateEvent, updateEventStatus } from './actions';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/shared/utils/admin', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/shared/db', () => ({
  db: {
    update: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('@/shared/db/schema', () => ({
  events: { id: 'events.id' },
  eventDefaultAllowedBetTypes: {
    eventId: 'eventDefaultAllowedBetTypes.eventId',
    betType: 'eventDefaultAllowedBetTypes.betType',
  },
}));

vi.mock('@/shared/lib/sse/event-emitter', () => ({
  raceEventEmitter: { emit: vi.fn() },
  RACE_EVENTS: { BET_RESTRICTION_UPDATED: 'BET_RESTRICTION_UPDATED' },
}));

import { db } from '@/shared/db';

// 更新系アクションは、管理者が開いている詳細ページも再検証しないと
// アクション応答で画面が更新されず、保存が反映されないように見える
describe('manage-events actions の再検証パス', () => {
  const eventId = 'event-123';

  const mockTx = {
    update: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });
    mockTx.update.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    });
    mockTx.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mockTx.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
    (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: (tx: typeof mockTx) => Promise<void>) =>
      cb(mockTx)
    );
  });

  it('updateEventStatus は一覧と詳細ページの両方を再検証すること', async () => {
    await updateEventStatus(eventId, 'ACTIVE');

    expect(revalidatePath).toHaveBeenCalledWith('/admin/events');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/events/${eventId}`);
  });

  it('updateEvent は一覧と詳細ページの両方を再検証すること', async () => {
    const formData = new FormData();
    formData.set('name', 'テストイベント');
    formData.set('distributeAmount', '100000');
    formData.set('loanEnabled', 'true');
    formData.set('loanThresholdPercent', '30');
    formData.set('date', '2026-09-02');

    await updateEvent(eventId, formData);

    expect(revalidatePath).toHaveBeenCalledWith('/admin/events');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/events/${eventId}`);
  });
});
