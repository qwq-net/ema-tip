import { BET_TYPES, BetDetail, BetType } from '@/entities/bet/constants';

export const ODDS_UNIT = 100;

export interface Finisher {
  horseNumber: number;
  bracketNumber: number;
}

export function isWinningBet(detail: BetDetail, finishers: Finisher[]): boolean {
  const { type, selections } = detail;
  const firstFinisher = finishers[0];
  const secondFinisher = finishers[1];
  const thirdFinisher = finishers[2];

  if (!firstFinisher) return false;

  switch (type) {
    case BET_TYPES.WIN:
      return selections[0] === firstFinisher.horseNumber;

    case BET_TYPES.PLACE:
      return finishers.slice(0, 3).some((f) => f.horseNumber === selections[0]);

    case BET_TYPES.QUINELLA:
      if (!secondFinisher) return false;
      return (
        (selections[0] === firstFinisher.horseNumber && selections[1] === secondFinisher.horseNumber) ||
        (selections[0] === secondFinisher.horseNumber && selections[1] === firstFinisher.horseNumber)
      );

    case BET_TYPES.EXACTA:
      if (!secondFinisher) return false;
      return selections[0] === firstFinisher.horseNumber && selections[1] === secondFinisher.horseNumber;

    case BET_TYPES.WIDE: {
      if (!secondFinisher) return false;
      if (selections.length !== 2) return false;
      if (new Set(selections).size !== 2) return false;
      const top3 = finishers.slice(0, 3).map((f) => f.horseNumber);
      return selections.every((s) => top3.includes(s));
    }

    case BET_TYPES.BRACKET_QUINELLA:
      if (!secondFinisher) return false;
      return (
        (selections[0] === firstFinisher.bracketNumber && selections[1] === secondFinisher.bracketNumber) ||
        (selections[0] === secondFinisher.bracketNumber && selections[1] === firstFinisher.bracketNumber)
      );

    case BET_TYPES.TRIO: {
      if (!secondFinisher || !thirdFinisher) return false;
      if (selections.length !== 3) return false;
      if (new Set(selections).size !== 3) return false;
      const top3 = finishers.slice(0, 3).map((f) => f.horseNumber);
      return selections.every((s) => top3.includes(s));
    }

    case BET_TYPES.TRIFECTA:
      if (!thirdFinisher || !secondFinisher) return false;
      return (
        selections[0] === firstFinisher.horseNumber &&
        selections[1] === secondFinisher.horseNumber &&
        selections[2] === thirdFinisher.horseNumber
      );

    default:
      return false;
  }
}

const ORDER_SENSITIVE_TYPES = new Set<BetType>([BET_TYPES.EXACTA, BET_TYPES.TRIFECTA, BET_TYPES.WIN, BET_TYPES.PLACE]);

export const isOrderSensitive = (type: BetType) => ORDER_SENSITIVE_TYPES.has(type);

export const normalizeSelections = (type: BetType, numbers: number[]) => {
  if (isOrderSensitive(type)) {
    return JSON.stringify(numbers);
  }
  return JSON.stringify([...numbers].sort((a, b) => a - b));
};

export function isRefundedBet(
  type: string,
  selections: number[],
  invalidHorseIds: Set<number>,
  validBrackets: Set<number>
): boolean {
  if (type === BET_TYPES.BRACKET_QUINELLA) {
    return selections.some((bracket) => !validBrackets.has(bracket));
  }
  return selections.some((horse) => invalidHorseIds.has(horse));
}

export function calculatePayoutRate(
  totalPool: number,
  winningAmount: number,
  totalWinningAmount: number,
  winningCount: number = 1
): number {
  if (winningAmount <= 0) return 0;

  let payoutPerUnit: number;

  if (winningCount > 1) {
    const profit = Math.max(0, totalPool - totalWinningAmount);
    const dividedProfit = profit / winningCount;
    payoutPerUnit = (winningAmount + dividedProfit) / winningAmount;
  } else {
    payoutPerUnit = totalPool / winningAmount;
  }

  const rate = Math.floor(payoutPerUnit * 10) / 10;
  return Math.max(1.0, rate);
}

export function getWinningCombinations(type: BetType, finishers: Finisher[]): number[][] {
  const firstFinisher = finishers[0];
  const secondFinisher = finishers[1];
  const thirdFinisher = finishers[2];

  if (!firstFinisher) return [];

  switch (type) {
    case BET_TYPES.WIN:
      return [[firstFinisher.horseNumber]];

    case BET_TYPES.PLACE:
      return finishers.slice(0, 3).map((f) => [f.horseNumber]);

    case BET_TYPES.QUINELLA:
      if (!secondFinisher) return [];
      return [[firstFinisher.horseNumber, secondFinisher.horseNumber].sort((a, b) => a - b)];

    case BET_TYPES.EXACTA:
      if (!secondFinisher) return [];
      return [[firstFinisher.horseNumber, secondFinisher.horseNumber]];

    case BET_TYPES.WIDE: {
      if (!secondFinisher) return [];
      const top3 = finishers.slice(0, 3).map((f) => f.horseNumber);
      const combos: number[][] = [];
      if (top3.length >= 2) {
        combos.push([top3[0], top3[1]].sort((a, b) => a - b));
      }
      if (top3.length >= 3) {
        combos.push([top3[0], top3[2]].sort((a, b) => a - b));
        combos.push([top3[1], top3[2]].sort((a, b) => a - b));
      }
      return combos;
    }

    case BET_TYPES.BRACKET_QUINELLA:
      if (!secondFinisher) return [];
      return [[firstFinisher.bracketNumber, secondFinisher.bracketNumber].sort((a, b) => a - b)];

    case BET_TYPES.TRIO: {
      if (!firstFinisher || !secondFinisher || !thirdFinisher) return [];
      return [[firstFinisher.horseNumber, secondFinisher.horseNumber, thirdFinisher.horseNumber].sort((a, b) => a - b)];
    }

    case BET_TYPES.TRIFECTA:
      if (!firstFinisher || !secondFinisher || !thirdFinisher) return [];
      return [[firstFinisher.horseNumber, secondFinisher.horseNumber, thirdFinisher.horseNumber]];

    default:
      return [];
  }
}
