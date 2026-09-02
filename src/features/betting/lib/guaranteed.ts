import { BetType, normalizeSelections } from '@/entities/bet';

// ベットの払戻または想定払戻に保証オッズが効いているかを返す。
// HIT は払戻結果の該当組み合わせの guaranteed フラグで判定し、PENDING は
// 差し込み済みの暫定オッズが保証倍率と一致するかで判定する。それ以外の status は常に false。
// 使われ方: 結果待機画面の「保証」バッジ表示用。fixedOddsMode のレースでは保証が適用されないため呼ばない前提。
export function isGuaranteedBet(params: {
  status: string;
  type: BetType;
  selections: number[];
  odds?: string | null;
  guaranteedOdds?: Record<string, number> | null;
  payoutCombinations?: { numbers: number[]; payout?: number; guaranteed?: boolean }[];
}): boolean {
  const { status, type, selections, odds, guaranteedOdds, payoutCombinations } = params;

  if (status === 'HIT') {
    const betKey = normalizeSelections(type, selections);
    const hit = payoutCombinations?.find((c) => normalizeSelections(type, c.numbers) === betKey);
    return hit?.guaranteed === true;
  }

  if (status === 'PENDING') {
    const guaranteedRate = guaranteedOdds?.[type];
    if (!odds || guaranteedRate === undefined) return false;
    return parseFloat(odds) === guaranteedRate;
  }

  return false;
}
