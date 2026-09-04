import { describe, expect, it } from 'vitest';
import { calculatePlaceOddsRange, calculateWinPopularity } from './odds';

describe('calculateWinPopularity', () => {
  it('金額の多い順に1から順位を振る', () => {
    expect(calculateWinPopularity({ '[1]': 300, '[2]': 1000, '[3]': 500 })).toEqual({
      '[2]': 1,
      '[3]': 2,
      '[1]': 3,
    });
  });

  it('同額は購入件数が多い方が上位になる', () => {
    expect(calculateWinPopularity({ '[1]': 500, '[2]': 500 }, { '[1]': 1, '[2]': 5 })).toEqual({
      '[2]': 1,
      '[1]': 2,
    });
  });

  it('同額同件数は選択肢の数値が小さい方が上位になり、順位は重複しない', () => {
    expect(calculateWinPopularity({ '[7]': 500, '[2]': 500, '[10]': 500 }, { '[7]': 2, '[2]': 2, '[10]': 2 })).toEqual({
      '[2]': 1,
      '[7]': 2,
      '[10]': 3,
    });
  });

  it('金額ゼロの選択肢は順位を持たない', () => {
    expect(calculateWinPopularity({ '[1]': 100, '[2]': 0 })).toEqual({ '[1]': 1 });
  });

  it('空の入力は空を返す', () => {
    expect(calculateWinPopularity({})).toEqual({});
  });
});

describe('calculatePlaceOddsRange', () => {
  it('最小は上位人気2頭と同着圏、最大は票のない2頭と同着圏の想定で幅を出す', () => {
    expect(calculatePlaceOddsRange({ '1': 600, '2': 300, '3': 100 })).toEqual({
      '1': { min: 1.0, max: 1.2 },
      '2': { min: 1.0, max: 1.7 },
      '3': { min: 1.0, max: 4.0 },
    });
  });

  it('保証オッズが下限として最小・最大の両方へ効く', () => {
    expect(calculatePlaceOddsRange({ '1': 600, '2': 300, '3': 100 }, 1.5)).toEqual({
      '1': { min: 1.5, max: 1.5 },
      '2': { min: 1.5, max: 1.7 },
      '3': { min: 1.5, max: 4.0 },
    });
  });

  it('1頭にしか票がなければ利益ゼロで下限1.0に張り付く', () => {
    expect(calculatePlaceOddsRange({ '5': 500 })).toEqual({ '5': { min: 1.0, max: 1.0 } });
  });

  it('金額ゼロの馬は結果に含まれない', () => {
    expect(calculatePlaceOddsRange({ '1': 100, '2': 0 })).toEqual({ '1': { min: 1.0, max: 1.0 } });
  });

  it('空の入力は空を返す', () => {
    expect(calculatePlaceOddsRange({})).toEqual({});
  });
});
