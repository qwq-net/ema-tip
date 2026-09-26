import { describe, expect, it } from 'vitest';
import { moveBracketGroup, moveSelectedEntries } from './entry-order';

const entries = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));

describe('moveSelectedEntries', () => {
  it('離れた選択を順序を保ったまま1行上げる', () => {
    expect(moveSelectedEntries(entries, new Set(['b', 'd']), 'up').map((entry) => entry.id)).toEqual([
      'b',
      'a',
      'd',
      'c',
      'e',
    ]);
  });

  it('先頭の選択は越境せず、残りだけ下げる', () => {
    expect(moveSelectedEntries(entries, new Set(['a', 'c']), 'down').map((entry) => entry.id)).toEqual([
      'b',
      'a',
      'd',
      'c',
      'e',
    ]);
  });
});

describe('moveBracketGroup', () => {
  const horses = Array.from({ length: 16 }, (_, index) => ({ id: String(index + 1) }));

  it('同じ枠の2頭をひとまとまりで隣の枠の前へ動かす', () => {
    expect(
      moveBracketGroup(horses, 2, 'up')
        .map((entry) => entry.id)
        .slice(0, 4)
    ).toEqual(['3', '4', '1', '2']);
  });

  it('端の枠は移動しない', () => {
    expect(moveBracketGroup(horses, 1, 'up')).toEqual(horses);
  });
});
