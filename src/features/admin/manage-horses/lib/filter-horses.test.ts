import { describe, expect, it } from 'vitest';
import { filterHorses } from './filter-horses';

const horses = [
  { name: 'イクイノックス', source: 'NETKEIBA' as const },
  { name: 'ドウデュース', source: 'MANUAL' as const },
];

describe('filterHorses', () => {
  it('馬名の部分一致で絞り込む', () => {
    expect(filterHorses(horses, 'イクイ', 'ALL')).toEqual([horses[0]]);
  });

  it('登録元で絞り込む', () => {
    expect(filterHorses(horses, '', 'MANUAL')).toEqual([horses[1]]);
  });

  it('ワードと登録元は AND で適用する', () => {
    expect(filterHorses(horses, 'イクイ', 'MANUAL')).toEqual([]);
  });

  it('空白のみのワードは全件扱いにする', () => {
    expect(filterHorses(horses, '  ', 'ALL')).toEqual(horses);
  });
});
