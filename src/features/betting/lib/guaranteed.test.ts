import { BET_TYPES } from '@/entities/bet';
import { describe, expect, it } from 'vitest';
import { isGuaranteedBet } from './guaranteed';

describe('isGuaranteedBet', () => {
  it('HIT: 払戻結果の該当組み合わせに guaranteed フラグがあれば true', () => {
    const result = isGuaranteedBet({
      status: 'HIT',
      type: BET_TYPES.WIN,
      selections: [1],
      payoutCombinations: [{ numbers: [1], payout: 350, guaranteed: true }],
    });
    expect(result).toBe(true);
  });

  it('HIT: 該当組み合わせに guaranteed フラグがなければ false', () => {
    const result = isGuaranteedBet({
      status: 'HIT',
      type: BET_TYPES.WIN,
      selections: [1],
      payoutCombinations: [{ numbers: [1], payout: 540 }],
    });
    expect(result).toBe(false);
  });

  it('HIT: 馬連は選択順が異なっても組み合わせが一致する', () => {
    const result = isGuaranteedBet({
      status: 'HIT',
      type: BET_TYPES.QUINELLA,
      selections: [2, 1],
      payoutCombinations: [{ numbers: [1, 2], payout: 1500, guaranteed: true }],
    });
    expect(result).toBe(true);
  });

  it('PENDING: 暫定オッズが保証倍率と一致すれば true', () => {
    const result = isGuaranteedBet({
      status: 'PENDING',
      type: BET_TYPES.WIN,
      selections: [1],
      odds: '3.5',
      guaranteedOdds: { [BET_TYPES.WIN]: 3.5 },
    });
    expect(result).toBe(true);
  });

  it('PENDING: 暫定オッズが保証倍率を上回れば false', () => {
    const result = isGuaranteedBet({
      status: 'PENDING',
      type: BET_TYPES.WIN,
      selections: [1],
      odds: '12.3',
      guaranteedOdds: { [BET_TYPES.WIN]: 3.5 },
    });
    expect(result).toBe(false);
  });

  it('PENDING: 暫定オッズが未設定なら false', () => {
    const result = isGuaranteedBet({
      status: 'PENDING',
      type: BET_TYPES.WIN,
      selections: [1],
      guaranteedOdds: { [BET_TYPES.WIN]: 3.5 },
    });
    expect(result).toBe(false);
  });

  it('LOST や REFUNDED は false', () => {
    expect(
      isGuaranteedBet({
        status: 'LOST',
        type: BET_TYPES.WIN,
        selections: [1],
        odds: '0.0',
        guaranteedOdds: { [BET_TYPES.WIN]: 3.5 },
      })
    ).toBe(false);
    expect(
      isGuaranteedBet({
        status: 'REFUNDED',
        type: BET_TYPES.WIN,
        selections: [1],
        odds: '1.0',
        guaranteedOdds: { [BET_TYPES.WIN]: 1.0 },
      })
    ).toBe(false);
  });
});
