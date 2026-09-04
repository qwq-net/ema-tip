// 順位1〜3の金銀銅トーン。ランキングの順位バッジと出馬表の人気チップで共通に使う。
// 文字色の金銀は白地で読めないため、淡い地色に濃い文字を載せるペアで定義する
export const MEDAL_RANK_CLASSES = {
  1: 'bg-amber-100 text-amber-700',
  2: 'bg-gray-200 text-gray-700',
  3: 'bg-orange-100 text-orange-800',
} as const;

// 1〜3位なら金銀銅のクラスを返し、それ以外は undefined を返す。
// 匿名公開のランキングは順位が文字列になるため、数値の1〜3だけを拾う
export function medalRankClass(rank: number | string): string | undefined {
  return rank === 1 || rank === 2 || rank === 3 ? MEDAL_RANK_CLASSES[rank] : undefined;
}
