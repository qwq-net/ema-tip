export function calculateBet5Count(selections: {
  race1: string[];
  race2: string[];
  race3: string[];
  race4: string[];
  race5: string[];
}): number {
  return (
    selections.race1.length *
    selections.race2.length *
    selections.race3.length *
    selections.race4.length *
    selections.race5.length
  );
}

export function calculateBet5Dividend(totalPot: number, winningUnitCount: number): number {
  if (winningUnitCount === 0) return 0;
  return Math.floor(totalPot / winningUnitCount);
}

/**
 * BET5 の 1 口が全 5 レースの勝ち馬を的中させているかを返す。
 * 勝ち馬が 5 レース分そろっていなければ的中は判定できないため不的中として扱う。
 */
export function isBet5Winner(
  ticketSelections: {
    race1: string[];
    race2: string[];
    race3: string[];
    race4: string[];
    race5: string[];
  },
  winners: string[]
): boolean {
  const selectionsByRace = [
    ticketSelections.race1,
    ticketSelections.race2,
    ticketSelections.race3,
    ticketSelections.race4,
    ticketSelections.race5,
  ];
  return selectionsByRace.every((selections, index) => {
    const winner = winners[index];
    return winner !== undefined && selections.includes(winner);
  });
}
