import { revalidatePath } from 'next/cache';
import type { Mock } from 'vitest';
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
    query: {
      events: { findFirst: vi.fn() },
      wallets: { findFirst: vi.fn() },
    },
  },
}));

import { db } from '@/shared/db';
import { raceEventEmitter } from '@/shared/lib/sse/event-emitter';

const eventId = 'event-123';

const mockSelectWhere = vi.fn();
const mockRaceSelectWhere = vi.fn();
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
  // 既定は makeFormData と同じ配布金額で参加者なし。変更検知のテストだけが上書きする
  vi.mocked(db.query.events.findFirst).mockResolvedValue({ distributeAmount: 100000 } as never);
  vi.mocked(db.query.wallets.findFirst).mockResolvedValue(undefined);
  (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
    set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  });
  mockSelectWhere.mockResolvedValue([]);
  // 既定券種の取得は from().where()、通知先レースの取得は from().leftJoin().where() を通る
  mockRaceSelectWhere.mockResolvedValue([{ id: 'race-1' }]);
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: mockSelectWhere,
      leftJoin: vi.fn().mockReturnValue({ where: mockRaceSelectWhere }),
    }),
  });
  mockTx.update.mockReturnValue({
    set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  });
  mockTx.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  mockInsertValues.mockResolvedValue(undefined);
  mockTx.insert.mockReturnValue({ values: mockInsertValues });
  (db.transaction as unknown as Mock).mockImplementation(async (cb: (tx: typeof mockTx) => Promise<void>) =>
    cb(mockTx)
  );
});

// 更新系アクションは、管理者が開いている詳細ページも再検証しないと
// アクション応答で画面が更新されず、保存が反映されないように見える
describe('manage-events actions の再検証パス', () => {
  it('updateEventStatus は一覧と、ヘッダーを持つ詳細レイアウト配下を再検証すること', async () => {
    await updateEventStatus(eventId, 'ACTIVE');

    expect(revalidatePath).toHaveBeenCalledWith('/admin/events');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/events/${eventId}`, 'layout');
  });

  it('updateEvent は一覧と詳細ページの両方を再検証すること', async () => {
    await updateEvent(eventId, makeFormData());

    expect(revalidatePath).toHaveBeenCalledWith('/admin/events');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/events/${eventId}`);
  });
});

describe('updateEvent の馬券種別デフォルト', () => {
  it('種別配列は全行削除後に insert し、デフォルトが効くレースごとに SSE を emit する', async () => {
    mockRaceSelectWhere.mockResolvedValue([{ id: 'race-1' }, { id: 'race-2' }]);

    await updateEvent(eventId, makeFormData(['win', 'trifecta']));

    expect(mockTx.delete).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith([
      { eventId, betType: 'win' },
      { eventId, betType: 'trifecta' },
    ]);
    expect(raceEventEmitter.emit).toHaveBeenCalledTimes(2);
    expect(raceEventEmitter.emit).toHaveBeenCalledWith(
      'BET_RESTRICTION_UPDATED',
      expect.objectContaining({ raceId: 'race-1' })
    );
    expect(raceEventEmitter.emit).toHaveBeenCalledWith(
      'BET_RESTRICTION_UPDATED',
      expect.objectContaining({ raceId: 'race-2' })
    );
  });

  // 個別指定のレースはイベントのデフォルトを読まないため、通知しても購入可能な種別は変わらない
  it('デフォルトが効くレースがなければ SSE を emit しない', async () => {
    mockRaceSelectWhere.mockResolvedValue([]);

    await updateEvent(eventId, makeFormData(['win']));

    expect(raceEventEmitter.emit).not.toHaveBeenCalled();
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

  it('不正な種別を含む JSON は拒否し、更新を実行しない', async () => {
    const result = await updateEvent(eventId, makeFormData(['single']));

    expect(result.success).toBe(false);
    expect(db.transaction).not.toHaveBeenCalled();
  });
});

// ウォレットは参加時点の配布金額で作られるため、参加者がいる状態で配布金額を変えると
// 全員の収支がずれる。変更は参加者が出る前だけ受け付ける
describe('updateEvent の配布金額ガード', () => {
  it('参加者がいるイベントの配布金額の変更を拒否し、更新を実行しない', async () => {
    vi.mocked(db.query.events.findFirst).mockResolvedValue({ distributeAmount: 50000 } as never);
    vi.mocked(db.query.wallets.findFirst).mockResolvedValue({ id: 'wallet-1' } as never);

    const result = await updateEvent(eventId, makeFormData());

    expect(result).toEqual({ success: false, error: expect.stringContaining('配布金額') });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('参加者がいても配布金額が同じなら更新できる', async () => {
    vi.mocked(db.query.wallets.findFirst).mockResolvedValue({ id: 'wallet-1' } as never);

    const result = await updateEvent(eventId, makeFormData());

    expect(result).toEqual({ success: true, data: undefined });
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });
});
