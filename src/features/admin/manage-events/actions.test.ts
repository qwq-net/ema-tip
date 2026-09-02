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
  },
}));

vi.mock('@/shared/db/schema', () => ({
  events: { id: 'events.id' },
}));

import { db } from '@/shared/db';

// 更新系アクションは、管理者が開いている詳細ページも再検証しないと
// アクション応答で画面が更新されず、保存が反映されないように見える
describe('manage-events actions の再検証パス', () => {
  const eventId = 'event-123';

  beforeEach(() => {
    vi.clearAllMocks();
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    });
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
