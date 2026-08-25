import { BET_TYPES, BetDetail } from '@/entities/bet/constants';
import { describe, expect, it } from 'vitest';
import {
  Finisher,
  calculatePayoutRate,
  getWinningCombinations,
  isRefundedBet,
  isWinningBet,
  normalizeSelections,
} from './payout';

describe('isWinningBet (的中判定)', () => {
  const finishers: Finisher[] = [
    { horseNumber: 1, bracketNumber: 1 },
    { horseNumber: 2, bracketNumber: 2 },
    { horseNumber: 3, bracketNumber: 3 },
  ];

  it('単勝 (WIN): 1着が的中', () => {
    const hit: BetDetail = { type: BET_TYPES.WIN, selections: [1] };
    const miss: BetDetail = { type: BET_TYPES.WIN, selections: [2] };
    expect(isWinningBet(hit, finishers)).toBe(true);
    expect(isWinningBet(miss, finishers)).toBe(false);
  });

  it('複勝 (PLACE): 3着以内が的中', () => {
    expect(isWinningBet({ type: BET_TYPES.PLACE, selections: [1] }, finishers)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.PLACE, selections: [2] }, finishers)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.PLACE, selections: [3] }, finishers)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.PLACE, selections: [4] }, finishers)).toBe(false);
  });

  it('馬連 (QUINELLA): 1-2着順不同', () => {
    expect(isWinningBet({ type: BET_TYPES.QUINELLA, selections: [1, 2] }, finishers)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.QUINELLA, selections: [2, 1] }, finishers)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.QUINELLA, selections: [1, 3] }, finishers)).toBe(false);
  });

  it('馬単 (EXACTA): 1-2着順序通り', () => {
    expect(isWinningBet({ type: BET_TYPES.EXACTA, selections: [1, 2] }, finishers)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.EXACTA, selections: [2, 1] }, finishers)).toBe(false);
  });

  it('ワイド (WIDE): 3着以内の2頭', () => {
    expect(isWinningBet({ type: BET_TYPES.WIDE, selections: [1, 2] }, finishers)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.WIDE, selections: [1, 3] }, finishers)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.WIDE, selections: [2, 3] }, finishers)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.WIDE, selections: [1, 4] }, finishers)).toBe(false);
  });

  it('ワイド (WIDE): 選択数不正・重複は不的中', () => {
    expect(isWinningBet({ type: BET_TYPES.WIDE, selections: [1] }, finishers)).toBe(false);
    expect(isWinningBet({ type: BET_TYPES.WIDE, selections: [1, 2, 3] }, finishers)).toBe(false);
    expect(isWinningBet({ type: BET_TYPES.WIDE, selections: [1, 1] }, finishers)).toBe(false);
  });

  it('枠連 (BRACKET_QUINELLA): 1-2着の枠順不同', () => {
    expect(isWinningBet({ type: BET_TYPES.BRACKET_QUINELLA, selections: [1, 2] }, finishers)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.BRACKET_QUINELLA, selections: [2, 1] }, finishers)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.BRACKET_QUINELLA, selections: [1, 3] }, finishers)).toBe(false);
  });

  it('3連複 (TRIO): 1-3着順不同', () => {
    expect(isWinningBet({ type: BET_TYPES.TRIO, selections: [1, 2, 3] }, finishers)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.TRIO, selections: [3, 2, 1] }, finishers)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.TRIO, selections: [1, 2, 4] }, finishers)).toBe(false);
  });

  it('3連複 (TRIO): 選択数不正・重複は不的中', () => {
    expect(isWinningBet({ type: BET_TYPES.TRIO, selections: [1, 2] }, finishers)).toBe(false);
    expect(isWinningBet({ type: BET_TYPES.TRIO, selections: [1, 2, 3, 4] }, finishers)).toBe(false);
    expect(isWinningBet({ type: BET_TYPES.TRIO, selections: [1, 1, 2] }, finishers)).toBe(false);
  });

  it('3連単 (TRIFECTA): 1-3着順序通り', () => {
    expect(isWinningBet({ type: BET_TYPES.TRIFECTA, selections: [1, 2, 3] }, finishers)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.TRIFECTA, selections: [1, 3, 2] }, finishers)).toBe(false);
  });

  it('フィニッシャーが空の場合、全て不的中', () => {
    expect(isWinningBet({ type: BET_TYPES.WIN, selections: [1] }, [])).toBe(false);
  });

  it('フィニッシャーが1頭のみの場合', () => {
    const singleFinisher: Finisher[] = [{ horseNumber: 5, bracketNumber: 3 }];
    expect(isWinningBet({ type: BET_TYPES.WIN, selections: [5] }, singleFinisher)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.PLACE, selections: [5] }, singleFinisher)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.QUINELLA, selections: [5, 1] }, singleFinisher)).toBe(false);
    expect(isWinningBet({ type: BET_TYPES.WIDE, selections: [5, 1] }, singleFinisher)).toBe(false);
    expect(isWinningBet({ type: BET_TYPES.TRIO, selections: [5, 1, 2] }, singleFinisher)).toBe(false);
    expect(isWinningBet({ type: BET_TYPES.TRIFECTA, selections: [5, 1, 2] }, singleFinisher)).toBe(false);
  });

  it('同枠の場合の枠連判定 (ゾロ目)', () => {
    const sameFlame: Finisher[] = [
      { horseNumber: 7, bracketNumber: 4 },
      { horseNumber: 8, bracketNumber: 4 },
    ];
    expect(isWinningBet({ type: BET_TYPES.BRACKET_QUINELLA, selections: [4, 4] }, sameFlame)).toBe(true);
    expect(isWinningBet({ type: BET_TYPES.BRACKET_QUINELLA, selections: [4, 5] }, sameFlame)).toBe(false);
  });
});

describe('getWinningCombinations (勝利組み合わせ生成)', () => {
  const finishers: Finisher[] = [
    { horseNumber: 1, bracketNumber: 1 },
    { horseNumber: 2, bracketNumber: 2 },
    { horseNumber: 3, bracketNumber: 3 },
  ];

  it('各券種の勝利組み合わせが正しいか', () => {
    expect(getWinningCombinations(BET_TYPES.WIN, finishers)).toEqual([[1]]);
    expect(getWinningCombinations(BET_TYPES.PLACE, finishers)).toEqual([[1], [2], [3]]);
    expect(getWinningCombinations(BET_TYPES.QUINELLA, finishers)).toEqual([[1, 2]]);
    expect(getWinningCombinations(BET_TYPES.EXACTA, finishers)).toEqual([[1, 2]]);
    expect(getWinningCombinations(BET_TYPES.WIDE, finishers)).toEqual([
      [1, 2],
      [1, 3],
      [2, 3],
    ]);
    expect(getWinningCombinations(BET_TYPES.TRIO, finishers)).toEqual([[1, 2, 3]]);
    expect(getWinningCombinations(BET_TYPES.TRIFECTA, finishers)).toEqual([[1, 2, 3]]);
  });

  it('フィニッシャー不足時の挙動', () => {
    const fewFinishers: Finisher[] = [{ horseNumber: 1, bracketNumber: 1 }];
    expect(getWinningCombinations(BET_TYPES.QUINELLA, fewFinishers)).toEqual([]);
    expect(getWinningCombinations(BET_TYPES.WIN, fewFinishers)).toEqual([[1]]);
  });

  it('フィニッシャーが2頭の場合、ワイドは1組のみ', () => {
    const twoFinishers: Finisher[] = [
      { horseNumber: 5, bracketNumber: 3 },
      { horseNumber: 8, bracketNumber: 4 },
    ];
    expect(getWinningCombinations(BET_TYPES.WIDE, twoFinishers)).toEqual([[5, 8]]);
    expect(getWinningCombinations(BET_TYPES.TRIO, twoFinishers)).toEqual([]);
    expect(getWinningCombinations(BET_TYPES.TRIFECTA, twoFinishers)).toEqual([]);
  });

  it('馬連のソート: 馬番が逆順でもソートされる', () => {
    const reversedFinishers: Finisher[] = [
      { horseNumber: 8, bracketNumber: 4 },
      { horseNumber: 3, bracketNumber: 2 },
      { horseNumber: 5, bracketNumber: 3 },
    ];
    expect(getWinningCombinations(BET_TYPES.QUINELLA, reversedFinishers)).toEqual([[3, 8]]);
    expect(getWinningCombinations(BET_TYPES.EXACTA, reversedFinishers)).toEqual([[8, 3]]);
  });
});

describe('calculatePayoutRate (オッズ計算)', () => {
  it('基本: 1人だけが的中した場合、プール全額÷的中金額', () => {
    const rate = calculatePayoutRate(1000, 100, 100);
    expect(rate).toBe(10.0);
  });

  it('最低倍率1.0を保証する (元返し)', () => {
    const rate = calculatePayoutRate(100, 100, 100);
    expect(rate).toBe(1.0);
  });

  it('最低倍率1.0以下にはならない (オーバーベット)', () => {
    const rate = calculatePayoutRate(50, 100, 100);
    expect(rate).toBe(1.0);
  });

  it('小数点第1位で切り捨て', () => {
    const rate = calculatePayoutRate(1000, 300, 300);
    expect(rate).toBe(3.3);
  });

  it('的中金額が0の場合は0を返す', () => {
    const rate = calculatePayoutRate(1000, 0, 0);
    expect(rate).toBe(0);
  });

  it('複数的中組み合わせがある場合のオッズ分配 (ワイド等)', () => {
    const rateA = calculatePayoutRate(1000, 200, 600, 3);
    expect(rateA).toBe(1.6);

    const rateB = calculatePayoutRate(1000, 300, 600, 3);
    expect(rateB).toBe(1.4);

    const rateC = calculatePayoutRate(1000, 100, 600, 3);
    expect(rateC).toBe(2.3);
  });

  it('複数的中で利益がゼロの場合', () => {
    const rate = calculatePayoutRate(500, 200, 500, 2);
    expect(rate).toBe(1.0);
  });

  it('大きなプールでの計算精度', () => {
    const rate = calculatePayoutRate(1000000, 10000, 10000);
    expect(rate).toBe(100.0);
  });
});

describe('normalizeSelections (選択正規化)', () => {
  it('順序依存の券種 (WIN): 順序がそのまま保持される', () => {
    expect(normalizeSelections(BET_TYPES.WIN, [3])).toBe(JSON.stringify([3]));
  });

  it('順序依存の券種 (EXACTA): 順序がそのまま保持される', () => {
    expect(normalizeSelections(BET_TYPES.EXACTA, [2, 1])).toBe(JSON.stringify([2, 1]));
    expect(normalizeSelections(BET_TYPES.EXACTA, [1, 2])).toBe(JSON.stringify([1, 2]));
    expect(normalizeSelections(BET_TYPES.EXACTA, [2, 1])).not.toBe(normalizeSelections(BET_TYPES.EXACTA, [1, 2]));
  });

  it('順序依存の券種 (TRIFECTA): 順序がそのまま保持される', () => {
    expect(normalizeSelections(BET_TYPES.TRIFECTA, [3, 1, 2])).toBe(JSON.stringify([3, 1, 2]));
  });

  it('順序非依存の券種 (QUINELLA): ソートされる', () => {
    expect(normalizeSelections(BET_TYPES.QUINELLA, [5, 2])).toBe(JSON.stringify([2, 5]));
    expect(normalizeSelections(BET_TYPES.QUINELLA, [2, 5])).toBe(JSON.stringify([2, 5]));
    expect(normalizeSelections(BET_TYPES.QUINELLA, [5, 2])).toBe(normalizeSelections(BET_TYPES.QUINELLA, [2, 5]));
  });

  it('順序非依存の券種 (WIDE): ソートされる', () => {
    expect(normalizeSelections(BET_TYPES.WIDE, [8, 3])).toBe(JSON.stringify([3, 8]));
  });

  it('順序非依存の券種 (TRIO): ソートされる', () => {
    expect(normalizeSelections(BET_TYPES.TRIO, [7, 2, 5])).toBe(JSON.stringify([2, 5, 7]));
  });

  it('順序非依存の券種 (BRACKET_QUINELLA): ソートされる', () => {
    expect(normalizeSelections(BET_TYPES.BRACKET_QUINELLA, [6, 1])).toBe(JSON.stringify([1, 6]));
  });

  it('PLACE は順序依存', () => {
    expect(normalizeSelections(BET_TYPES.PLACE, [4])).toBe(JSON.stringify([4]));
  });
});

describe('isRefundedBet (返還判定)', () => {
  const invalidHorseIds = new Set([4, 5]);
  const validBrackets = new Set([1, 2, 3]);

  it('単勝: 取消馬への投票は返還', () => {
    expect(isRefundedBet(BET_TYPES.WIN, [4], invalidHorseIds, validBrackets)).toBe(true);
    expect(isRefundedBet(BET_TYPES.WIN, [1], invalidHorseIds, validBrackets)).toBe(false);
  });

  it('複勝: 取消馬への投票は返還', () => {
    expect(isRefundedBet(BET_TYPES.PLACE, [5], invalidHorseIds, validBrackets)).toBe(true);
    expect(isRefundedBet(BET_TYPES.PLACE, [2], invalidHorseIds, validBrackets)).toBe(false);
  });

  it('馬連: 片方でも取消馬なら返還', () => {
    expect(isRefundedBet(BET_TYPES.QUINELLA, [1, 4], invalidHorseIds, validBrackets)).toBe(true);
    expect(isRefundedBet(BET_TYPES.QUINELLA, [4, 5], invalidHorseIds, validBrackets)).toBe(true);
    expect(isRefundedBet(BET_TYPES.QUINELLA, [1, 2], invalidHorseIds, validBrackets)).toBe(false);
  });

  it('3連単: 1頭でも取消馬なら返還', () => {
    expect(isRefundedBet(BET_TYPES.TRIFECTA, [1, 2, 4], invalidHorseIds, validBrackets)).toBe(true);
    expect(isRefundedBet(BET_TYPES.TRIFECTA, [1, 2, 3], invalidHorseIds, validBrackets)).toBe(false);
  });

  it('3連複: 1頭でも取消馬なら返還', () => {
    expect(isRefundedBet(BET_TYPES.TRIO, [1, 4, 3], invalidHorseIds, validBrackets)).toBe(true);
    expect(isRefundedBet(BET_TYPES.TRIO, [1, 2, 3], invalidHorseIds, validBrackets)).toBe(false);
  });

  it('ワイド: 片方でも取消馬なら返還', () => {
    expect(isRefundedBet(BET_TYPES.WIDE, [1, 5], invalidHorseIds, validBrackets)).toBe(true);
    expect(isRefundedBet(BET_TYPES.WIDE, [1, 3], invalidHorseIds, validBrackets)).toBe(false);
  });

  it('馬単: 片方でも取消馬なら返還', () => {
    expect(isRefundedBet(BET_TYPES.EXACTA, [4, 1], invalidHorseIds, validBrackets)).toBe(true);
    expect(isRefundedBet(BET_TYPES.EXACTA, [1, 2], invalidHorseIds, validBrackets)).toBe(false);
  });

  it('枠連: 無効枠が含まれていたら返還', () => {
    expect(isRefundedBet(BET_TYPES.BRACKET_QUINELLA, [1, 4], invalidHorseIds, validBrackets)).toBe(true);
    expect(isRefundedBet(BET_TYPES.BRACKET_QUINELLA, [1, 2], invalidHorseIds, validBrackets)).toBe(false);
  });

  it('枠連: 枠判定は validBrackets を使い、invalidHorseIds は無関係', () => {
    const horseInvalid = new Set([1]);
    const bracketsValid = new Set([1, 2]);
    expect(isRefundedBet(BET_TYPES.BRACKET_QUINELLA, [1, 2], horseInvalid, bracketsValid)).toBe(false);
  });

  it('取消馬がいない場合は全券種で返還なし', () => {
    const noInvalid = new Set<number>();
    const allBrackets = new Set([1, 2, 3, 4, 5]);
    expect(isRefundedBet(BET_TYPES.WIN, [1], noInvalid, allBrackets)).toBe(false);
    expect(isRefundedBet(BET_TYPES.QUINELLA, [1, 2], noInvalid, allBrackets)).toBe(false);
    expect(isRefundedBet(BET_TYPES.BRACKET_QUINELLA, [1, 2], noInvalid, allBrackets)).toBe(false);
    expect(isRefundedBet(BET_TYPES.TRIFECTA, [1, 2, 3], noInvalid, allBrackets)).toBe(false);
  });
});
