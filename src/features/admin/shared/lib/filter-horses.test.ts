import { describe, expect, it } from 'vitest';
import { filterHorses } from './filter-horses';

const horses = [
  { name: 'イクイノックス', source: 'NETKEIBA' as const, type: 'REAL' as const },
  { name: 'ドウデュース', source: 'MANUAL' as const, type: 'FICTIONAL' as const },
];

describe('filterHorses', () => {
  it('馬名の部分一致で絞り込む', () => {
    expect(filterHorses(horses, 'イクイ', 'ALL', 'ALL')).toEqual([horses[0]]);
  });

  it('登録元で絞り込む', () => {
    expect(filterHorses(horses, '', 'MANUAL', 'ALL')).toEqual([horses[1]]);
  });

  it('種別で絞り込む', () => {
    expect(filterHorses(horses, '', 'ALL', 'FICTIONAL')).toEqual([horses[1]]);
  });

  it('ワード・登録元・種別は AND で適用する', () => {
    expect(filterHorses(horses, 'イクイ', 'NETKEIBA', 'FICTIONAL')).toEqual([]);
    expect(filterHorses(horses, 'イクイ', 'NETKEIBA', 'REAL')).toEqual([horses[0]]);
  });

  it('空白のみのワードは全件扱いにする', () => {
    expect(filterHorses(horses, '  ', 'ALL', 'ALL')).toEqual(horses);
  });
});
