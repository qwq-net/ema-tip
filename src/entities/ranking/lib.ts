/**
 * 基準値の降順に並べ替えて順位を付ける。同値は同順位とし、次の順位は人数分飛ぶ方式。
 * 入力の並びが同値の並び順になるため、呼び手は作成順など決定的な順で渡すこと。
 */
export function rankByBasis<T>(rows: readonly T[], basisOf: (row: T) => number): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => basisOf(b) - basisOf(a));
  let lastBasis: number | null = null;
  let lastRank = 0;
  return sorted.map((row, index) => {
    const basis = basisOf(row);
    const rank = lastBasis !== null && basis === lastBasis ? lastRank : index + 1;
    lastBasis = basis;
    lastRank = rank;
    return { ...row, rank };
  });
}

/**
 * 配布金額に対する収支。借入があればその返済分も差し引く。
 * 所持金 10,000 円・配布 500,000 円・借入 500,000 円なら -990,000 円になる。
 */
export function resultDiff(balance: number, distributeAmount: number, totalLoaned = 0): number {
  return balance - totalLoaned - distributeAmount;
}

/** 収支を「+9,400円」「-990,000円」の形にする。0 は「±0円」。 */
export function formatSignedYen(value: number): string {
  let sign = '±';
  if (value > 0) sign = '+';
  if (value < 0) sign = '-';
  return `${sign}${Math.abs(value).toLocaleString('ja-JP')}円`;
}

/** 収支の文字色。プラスは情報色の青、マイナスはエラー色の赤、増減なしの 0 は本文色を返す。 */
export function resultDiffClass(diff: number): string {
  if (diff > 0) return 'text-info';
  if (diff < 0) return 'text-error';
  return 'text-text-main';
}
