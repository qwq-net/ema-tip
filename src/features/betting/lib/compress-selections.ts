export interface CompressedRow {
  positions: number[][];
  betCount: number;
  hasHit: boolean;
}

interface BetInput {
  selections: number[];
  status: 'PENDING' | 'HIT' | 'LOST' | 'REFUNDED';
}

/**
 * 同一券種のベット群を、桁ごとの選択馬番の和集合へ畳んだ 1 行にまとめる。
 * 桁数は先頭のベットに合わせ、それより長い選択のはみ出した桁は捨てる。
 * ベットが 1 件も無ければ行を作らない。
 */
export function compressBetSelections(bets: BetInput[]): CompressedRow[] {
  const [firstBet] = bets;
  if (firstBet === undefined) return [];

  const positions: Set<number>[] = Array.from({ length: firstBet.selections.length }, () => new Set());

  for (const bet of bets) {
    bet.selections.forEach((sel, index) => {
      positions[index]?.add(sel);
    });
  }

  const sortedPositions = positions.map((set) => [...set].sort((a, b) => a - b));

  return [
    {
      positions: sortedPositions,
      betCount: bets.length,
      hasHit: bets.some((b) => b.status === 'HIT'),
    },
  ];
}
