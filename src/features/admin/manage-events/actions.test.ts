import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateEvent, updateEventStatus } from './actions';

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

import { db } from '@/shared/db';
import { raceEventEmitter } from '@/shared/lib/sse/event-emitter';

const eventId = 'event-123';

const mockSelectWhere = vi.fn();
const mockInsertValues = vi.fn();
const mockTx = {
  update: vi.fn(),
  delete: vi.fn(),
  insert: vi.fn(),
};

// updateEvent の必須フィールドを埋めた FormData を作る。allowedBetTypes は JSON 文字列で渡す
function makeFormData(allowedBetTypes: string[] | null = null) {
  const formData = new FormData();
  formData.set('name', 'テストイベント');
  formData.set('distributeAmount', '100000');
  formData.set('loanEnabled', 'true');
  formData.set('loanThresholdPercent', '30');
  formData.set('date', '2026-09-02');
  formData.set('allowedBetTypes', JSON.stringify(allowedBetTypes));
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
    set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  });
  mockSelectWhere.mockResolvedValue([]);
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn().mockReturnValue({ where: mockSelectWhere }),
  });
  mockTx.update.mockReturnValue({
    set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  });
  mockTx.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  mockInsertValues.mockResolvedValue(undefined);
  mockTx.insert.mockReturnValue({ values: mockInsertValues });
  (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: (tx: typeof mockTx) => Promise<void>) =>
    cb(mockTx)
  );
});

// 更新系アクションは、管理者が開いている詳細ページも再検証しないと
// アクション応答で画面が更新されず、保存が反映されないように見える
describe('manage-events actions の再検証パス', () => {
  it('updateEventStatus は一覧と詳細ページの両方を再検証すること', async () => {
    await updateEventStatus(eventId, 'ACTIVE');

    expect(revalidatePath).toHaveBeenCalledWith('/admin/events');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/events/${eventId}`);
  });

  it('updateEvent は一覧と詳細ページの両方を再検証すること', async () => {
    await updateEvent(eventId, makeFormData());

    expect(revalidatePath).toHaveBeenCalledWith('/admin/events');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/events/${eventId}`);
  });
});

describe('updateEvent の馬券種別デフォルト', () => {
  it('種別配列は全行削除後に insert し、変更ありとして SSE を emit する', async () => {
    await updateEvent(eventId, makeFormData(['win', 'trifecta']));

    expect(mockTx.delete).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith([
      { eventId, betType: 'win' },
      { eventId, betType: 'trifecta' },
    ]);
    expect(raceEventEmitter.emit).toHaveBeenCalledWith('BET_RESTRICTION_UPDATED', expect.objectContaining({ eventId }));
  });

  it('null は行を削除するだけで insert しない', async () => {
    await updateEvent(eventId, makeFormData(null));

    expect(mockTx.delete).toHaveBeenCalledTimes(1);
    expect(mockTx.insert).not.toHaveBeenCalled();
  });

  it('種別が変わらない保存では SSE を emit しない', async () => {
    mockSelectWhere.mockResolvedValue([{ betType: 'win' }]);

    await updateEvent(eventId, makeFormData(['win']));

    expect(raceEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('未設定のままの保存では SSE を emit しない', async () => {
    await updateEvent(eventId, makeFormData(null));

    expect(raceEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('不正な種別を含む JSON は拒否する', async () => {
    await expect(updateEvent(eventId, makeFormData(['single' as never]))).rejects.toThrow('無効な入力です');
  });
});
