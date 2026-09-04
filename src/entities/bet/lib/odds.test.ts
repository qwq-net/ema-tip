import { describe, expect, it } from 'vitest';
import { calculateWinPopularity } from './odds';

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
