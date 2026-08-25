export interface CompressedRow {
  positions: number[][];
  betCount: number;
  hasHit: boolean;
}

interface BetInput {
  selections: number[];
  status: 'PENDING' | 'HIT' | 'LOST' | 'REFUNDED';
}

export function compressBetSelections(bets: BetInput[]): CompressedRow[] {
  if (bets.length === 0) return [];

  const selectionLength = bets[0].selections.length;
  const positions: Set<number>[] = Array.from({ length: selectionLength }, () => new Set());

  for (const bet of bets) {
    bet.selections.forEach((sel, index) => {
      if (index < selectionLength) {
        positions[index].add(sel);
      }
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
