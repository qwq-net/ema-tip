import { calculateBracketNumber } from '@/shared/utils/bracket';

type Direction = 'up' | 'down';

/** 選択した出走馬をそれぞれ1行動かす。選択馬どうしの順序は保ち、端にある馬はそのままにする。 */
export function moveSelectedEntries<T extends { id: string }>(
  entries: T[],
  selectedIds: ReadonlySet<string>,
  direction: Direction
): T[] {
  const next = [...entries];
  if (direction === 'up') {
    for (let index = 1; index < next.length; index++) {
      const current = next[index];
      const adjacent = next[index - 1];
      if (current && adjacent && selectedIds.has(current.id) && !selectedIds.has(adjacent.id)) {
        next[index - 1] = current;
        next[index] = adjacent;
      }
    }
  } else {
    for (let index = next.length - 2; index >= 0; index--) {
      const current = next[index];
      const adjacent = next[index + 1];
      if (current && adjacent && selectedIds.has(current.id) && !selectedIds.has(adjacent.id)) {
        next[index] = adjacent;
        next[index + 1] = current;
      }
    }
  }
  return next;
}

/** 現在の枠に属する馬をひとまとまりにして隣の枠と入れ替える。移動後の枠番は馬番から再計算される。 */
export function moveBracketGroup<T>(entries: T[], bracketNumber: number, direction: Direction): T[] {
  const total = entries.length;
  const targetBracket = bracketNumber + (direction === 'up' ? -1 : 1);
  const selected = entries.filter((_, index) => calculateBracketNumber(index + 1, total) === bracketNumber);
  const adjacent = entries.filter((_, index) => calculateBracketNumber(index + 1, total) === targetBracket);
  if (selected.length === 0 || adjacent.length === 0) return entries;

  const firstIndex = entries.findIndex(
    (_, index) => calculateBracketNumber(index + 1, total) === Math.min(bracketNumber, targetBracket)
  );
  const before = entries.slice(0, firstIndex);
  const after = entries.slice(firstIndex + selected.length + adjacent.length);
  return direction === 'up'
    ? [...before, ...selected, ...adjacent, ...after]
    : [...before, ...adjacent, ...selected, ...after];
}
