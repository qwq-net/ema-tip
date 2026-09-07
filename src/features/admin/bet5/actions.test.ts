import { ActionError } from '@/shared/utils/action-result';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/entities/bet/lib/bet5-event', () => ({
  createBet5Event: vi.fn(),
  closeBet5Event: vi.fn(),
  updateBet5InitialPot: vi.fn(),
  calculateBet5Payout: vi.fn(),
}));

vi.mock('@/shared/db', () => ({ db: {} }));
vi.mock('@/shared/utils/admin', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN', name: '管理者' } }),
}));
vi.mock('@/shared/utils/admin-audit', () => ({ logAdminAction: vi.fn() }));

import { calculateBet5Payout, createBet5Event } from '@/entities/bet/lib/bet5-event';
import { calculateBet5PayoutAction, createBet5EventAction } from './actions';

const raceIds = ['r1', 'r2', 'r3', 'r4', 'r5'] as [string, string, string, string, string];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BET5 管理アクションの業務エラー', () => {
  it('createBet5EventAction は業務エラーを throw せず ActionResult で返す', async () => {
    vi.mocked(createBet5Event).mockRejectedValue(new ActionError('締め切られていないレースのみBET5に設定できます'));

    const result = await createBet5EventAction({ eventId: 'event-1', raceIds, initialPot: 5000 });

    expect(result).toEqual({ success: false, error: '締め切られていないレースのみBET5に設定できます' });
  });

  it('calculateBet5PayoutAction は精算できない理由を error に入れて返す', async () => {
    vi.mocked(calculateBet5Payout).mockResolvedValue({
      success: false,
      message: 'BET5イベントが締切状態ではありません',
    });

    const result = await calculateBet5PayoutAction('bet5-1', 'event-1');

    expect(result).toEqual({ success: false, error: 'BET5イベントが締切状態ではありません' });
  });
});
