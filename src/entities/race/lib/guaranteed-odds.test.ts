import { BET_TYPES } from '@/entities/bet';
import { describe, expect, it } from 'vitest';
import { defaultGuaranteedOddsSchema, guaranteedOddsOverrideSchema, resolveGuaranteedOdds } from './guaranteed-odds';

const allTypes = {
  win: 3.5,
  place: 1.5,
  bracket_quinella: 8,
  quinella: 15,
  wide: 5,
  exacta: 30,
  trio: 40,
  trifecta: 200,
};

describe('resolveGuaranteedOdds', () => {
  it('レースに無い券種はデフォルトの値になる', () => {
    const result = resolveGuaranteedOdds({ win: 3.5, place: 1.5 }, { win: 3.0 });
    expect(result).toEqual({ win: 3.0, place: 1.5 });
  });

  it('レースの上書きが null でもデフォルトをそのまま返す', () => {
    expect(resolveGuaranteedOdds({ win: 3.5 }, null)).toEqual({ win: 3.5 });
  });

  it('デフォルトにも上書きにも無い券種は結果に含まれない', () => {
    const result = resolveGuaranteedOdds({ win: 3.5 }, {});
    expect(result[BET_TYPES.PLACE]).toBeUndefined();
  });
});

describe('guaranteedOddsOverrideSchema', () => {
  it('1.1 は受け付ける', () => {
    expect(guaranteedOddsOverrideSchema.safeParse({ win: 1.1 }).success).toBe(true);
  });

  it('1.1 未満は拒否する', () => {
    expect(guaranteedOddsOverrideSchema.safeParse({ win: 1.0 }).success).toBe(false);
  });

  it('一部の券種だけでも受け付ける', () => {
    expect(guaranteedOddsOverrideSchema.safeParse({}).success).toBe(true);
    expect(guaranteedOddsOverrideSchema.safeParse({ place: 2.0 }).success).toBe(true);
  });

  it('券種以外のキーは拒否する', () => {
    expect(guaranteedOddsOverrideSchema.safeParse({ bogus: 2.0 }).success).toBe(false);
  });
});

describe('defaultGuaranteedOddsSchema', () => {
  it('全券種が揃っていれば受け付ける', () => {
    expect(defaultGuaranteedOddsSchema.safeParse(allTypes).success).toBe(true);
  });

  it('券種が欠けていると拒否する', () => {
    const missingOne = Object.fromEntries(Object.entries(allTypes).filter(([key]) => key !== 'trifecta'));
    expect(defaultGuaranteedOddsSchema.safeParse(missingOne).success).toBe(false);
  });

  it('1.1 未満の券種があると拒否する', () => {
    expect(defaultGuaranteedOddsSchema.safeParse({ ...allTypes, place: 1.0 }).success).toBe(false);
  });
});
