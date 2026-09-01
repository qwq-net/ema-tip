import type { HorseSource } from '@/entities/horse/types';

export type SourceFilter = 'ALL' | HorseSource;

// 馬名の部分一致と登録元の AND で絞り込む。word は trim 後に空なら全件一致として扱う。
export function filterHorses<T extends { name: string; source: HorseSource }>(
  horses: T[],
  word: string,
  source: SourceFilter
): T[] {
  const trimmed = word.trim();
  return horses.filter(
    (horse) => (trimmed === '' || horse.name.includes(trimmed)) && (source === 'ALL' || horse.source === source)
  );
}
