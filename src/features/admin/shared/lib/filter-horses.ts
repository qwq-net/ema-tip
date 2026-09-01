import type { HorseSource, HorseType } from '@/entities/horse/types';

export type SourceFilter = 'ALL' | HorseSource;
export type TypeFilter = 'ALL' | HorseType;

export const SOURCE_FILTER_OPTIONS = [
  { value: 'ALL', label: '全て' },
  { value: 'MANUAL', label: '手動登録' },
  { value: 'NETKEIBA', label: 'Netkeiba経由' },
] as const satisfies { value: SourceFilter; label: string }[];

export const TYPE_FILTER_OPTIONS = [
  { value: 'ALL', label: '全て' },
  { value: 'REAL', label: '実在' },
  { value: 'FICTIONAL', label: '架空' },
] as const satisfies { value: TypeFilter; label: string }[];

// 馬名の部分一致・登録元・種別の AND で絞り込む。word は trim 後に空なら全件一致として扱う。
export function filterHorses<T extends { name: string; source: HorseSource; type: HorseType }>(
  horses: T[],
  word: string,
  source: SourceFilter,
  type: TypeFilter
): T[] {
  const trimmed = word.trim();
  return horses.filter(
    (horse) =>
      (trimmed === '' || horse.name.includes(trimmed)) &&
      (source === 'ALL' || horse.source === source) &&
      (type === 'ALL' || horse.type === type)
  );
}
