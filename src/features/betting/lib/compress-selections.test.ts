import { describe, expect, it } from 'vitest';
import { compressBetSelections } from './compress-selections';

function bet(selections: number[], status: 'PENDING' | 'HIT' | 'LOST' = 'PENDING') {
  return { selections, status } as const;
}

describe('compressBetSelections (Simplified)', () => {
  it('空配列の場合、空を返す', () => {
    expect(compressBetSelections([])).toEqual([]);
  });

  describe('単勝/複勝 (1選択)', () => {
    it('すべての番号を1行にまとめる', () => {
      const result = compressBetSelections([bet([1]), bet([3]), bet([5])]);
      expect(result).toEqual([{ positions: [[1, 3, 5]], betCount: 3, hasHit: false }]);
    });

    it('的中がある場合 hasHit=true', () => {
      const result = compressBetSelections([bet([1], 'HIT'), bet([3])]);
      expect(result).toEqual([{ positions: [[1, 3]], betCount: 2, hasHit: true }]);
    });
  });

  describe('馬連/馬単 (2選択)', () => {
    it('全ての選択肢をポジションごとにマージする (単純フォーメーション)', () => {
      const result = compressBetSelections([bet([1, 3]), bet([1, 4]), bet([2, 5])]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        positions: [
          [1, 2],
          [3, 4, 5],
        ],
        betCount: 3,
        hasHit: false,
      });
    });
  });

  describe('三連複/三連単 (3選択)', () => {
    it('全ての選択肢をポジションごとにマージする (単純フォーメーション)', () => {
      const result = compressBetSelections([bet([1, 13, 2]), bet([1, 13, 3]), bet([1, 14, 4])]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        positions: [[1], [13, 14], [2, 3, 4]],
        betCount: 3,
        hasHit: false,
      });
    });

    it('的中ベットを含む行は hasHit=true', () => {
      const result = compressBetSelections([bet([1, 14, 2], 'HIT'), bet([1, 14, 3]), bet([1, 14, 4])]);
      expect(result).toEqual([{ positions: [[1], [14], [2, 3, 4]], betCount: 3, hasHit: true }]);
    });
  });

  describe('並び順 (Sort Order)', () => {
    it('各ポジション内で馬番昇順でソートされる', () => {
      const result = compressBetSelections([bet([2, 5, 3]), bet([1, 2, 4])]);
      expect(result[0]!.positions).toEqual([
        [1, 2],
        [2, 5],
        [3, 4],
      ]);
    });
  });
});
