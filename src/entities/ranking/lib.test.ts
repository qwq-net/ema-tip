import { describe, expect, it } from 'vitest';
import { formatSignedYen, rankByBasis, resultDiff } from './lib';

describe('rankByBasis', () => {
  it('基準値の降順に並べ、同値は同順位で次の順位を人数分飛ばすこと', () => {
    const rows = [
      { id: 'a', v: 100 },
      { id: 'b', v: 300 },
      { id: 'c', v: 100 },
      { id: 'd', v: 50 },
    ];
    expect(rankByBasis(rows, (r) => r.v).map((r) => [r.id, r.rank])).toEqual([
      ['b', 1],
      ['a', 2],
      ['c', 2],
      ['d', 4],
    ]);
  });

  it('同値は入力順を保つこと', () => {
    const rows = [
      { id: 'later', v: 1 },
      { id: 'earlier', v: 1 },
    ];
    expect(rankByBasis(rows, (r) => r.v).map((r) => r.id)).toEqual(['later', 'earlier']);
  });
});

describe('resultDiff', () => {
  it('借入がなければ所持金と配布金額の差になること', () => {
    expect(resultDiff(509_400, 500_000)).toBe(9_400);
  });

  it('借入があれば返済分も差し引くこと', () => {
    expect(resultDiff(10_000, 500_000, 500_000)).toBe(-990_000);
    expect(resultDiff(509_400, 500_000, 500_000)).toBe(-490_600);
  });
});

describe('formatSignedYen', () => {
  it('符号と桁区切りを付けること', () => {
    expect(formatSignedYen(9400)).toBe('+9,400円');
    expect(formatSignedYen(-990000)).toBe('-990,000円');
    expect(formatSignedYen(0)).toBe('±0円');
  });
});
