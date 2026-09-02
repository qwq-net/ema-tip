import { describe, expect, it } from 'vitest';
import { resolveAllowedBetTypes, toAllowedBetTypes } from './resolve-allowed';

describe('toAllowedBetTypes', () => {
  it('空配列は null に正規化する', () => {
    expect(toAllowedBetTypes([])).toBeNull();
  });

  it('BET_TYPE_ORDER の表示順に整列し重複を除去する', () => {
    expect(toAllowedBetTypes(['trifecta', 'win', 'win'])).toEqual(['win', 'trifecta']);
  });
});

describe('resolveAllowedBetTypes', () => {
  it('レース設定があればレース設定を返す', () => {
    expect(resolveAllowedBetTypes(['win'], ['trifecta'])).toEqual(['win']);
  });

  it('レース設定が空ならイベント設定を返す', () => {
    expect(resolveAllowedBetTypes([], ['trifecta'])).toEqual(['trifecta']);
  });

  it('どちらも空なら null を返す', () => {
    expect(resolveAllowedBetTypes([], [])).toBeNull();
  });
});
