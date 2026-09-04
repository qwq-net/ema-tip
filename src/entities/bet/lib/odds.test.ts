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

  it('同額は同順位になり、次の順位はその数だけ飛ぶ', () => {
    expect(calculateWinPopularity({ '[1]': 500, '[2]': 500, '[3]': 100 })).toEqual({
      '[1]': 1,
      '[2]': 1,
      '[3]': 3,
    });
  });

  it('金額ゼロの選択肢は順位を持たない', () => {
    expect(calculateWinPopularity({ '[1]': 100, '[2]': 0 })).toEqual({ '[1]': 1 });
  });

  it('空の入力は空を返す', () => {
    expect(calculateWinPopularity({})).toEqual({});
  });
});
