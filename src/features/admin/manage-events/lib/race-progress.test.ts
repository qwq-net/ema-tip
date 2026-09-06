import { describe, expect, it } from 'vitest';
import { describeRaceProgress } from './race-progress';

describe('describeRaceProgress', () => {
  it('レースがなければ未登録と返すこと', () => {
    expect(describeRaceProgress([])).toBe('レース未登録');
  });

  it('総数と払戻確定数を出し、締切済みが 0 ならその句を省くこと', () => {
    expect(describeRaceProgress(['SCHEDULED', 'FINALIZED', 'FINALIZED'])).toBe('3 レース中 2 レース払戻確定');
  });

  it('締切済みがあれば末尾に添えること', () => {
    expect(describeRaceProgress(['CLOSED', 'FINALIZED', 'SCHEDULED', 'CLOSED', 'SCHEDULED'])).toBe(
      '5 レース中 1 レース払戻確定・2 レース締切済み'
    );
  });
});
