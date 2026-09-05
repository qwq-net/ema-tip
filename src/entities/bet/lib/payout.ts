import { BET_TYPES, BetDetail, BetType } from '@/entities/bet/constants';

export const ODDS_UNIT = 100;

export interface Finisher {
  horseNumber: number;
  bracketNumber: number;
}

/** 券種ごとに的中判定へ必要な着順の数。これ未満しか確定していなければ判定せず不的中として扱う */
const REQUIRED_FINISHERS = {
  [BET_TYPES.WIN]: 1,
  [BET_TYPES.PLACE]: 1,
  [BET_TYPES.BRACKET_QUINELLA]: 2,
  [BET_TYPES.QUINELLA]: 2,
  [BET_TYPES.WIDE]: 2,
  [BET_TYPES.EXACTA]: 2,
  [BET_TYPES.TRIFECTA]: 3,
  [BET_TYPES.TRIO]: 3,
} satisfies Record<BetType, number>;

const asc = (a: number, b: number) => a - b;

/** 2 つの選択が first と second の組と順不同で一致するか */
function isUnorderedPair(selections: number[], first: number, second: number): boolean {
  return (selections[0] === first && selections[1] === second) || (selections[0] === second && selections[1] === first);
}

/** 選択が重複なく size 個あり、すべて上位 3 着の馬番に含まれるか */
function isDistinctSubsetOfTop3(selections: number[], size: number, finishers: Finisher[]): boolean {
  if (selections.length !== size) return false;
  if (new Set(selections).size !== size) return false;
  const top3 = finishers.slice(0, 3).map((f) => f.horseNumber);
  return selections.every((s) => top3.includes(s));
}

export function isWinningBet(detail: BetDetail, finishers: Finisher[]): boolean {
  const { type, selections } = detail;

  // 券種が必要とする着順が揃っていなければ判定できない。noUncheckedIndexedAccess は無効だが
  // 実行時には着順が足りない状態が起こりうるため、この 1 箇所で防ぐ
  if (finishers.length < REQUIRED_FINISHERS[type]) return false;

  const firstFinisher = finishers[0];
  const secondFinisher = finishers[1];
  const thirdFinisher = finishers[2];

  switch (type) {
    case BET_TYPES.WIN:
      return selections[0] === firstFinisher.horseNumber;

    case BET_TYPES.PLACE:
      return finishers.slice(0, 3).some((f) => f.horseNumber === selections[0]);

    case BET_TYPES.QUINELLA:
      return isUnorderedPair(selections, firstFinisher.horseNumber, secondFinisher.horseNumber);

    case BET_TYPES.EXACTA:
      return selections[0] === firstFinisher.horseNumber && selections[1] === secondFinisher.horseNumber;

    case BET_TYPES.WIDE:
      return isDistinctSubsetOfTop3(selections, 2, finishers);

    case BET_TYPES.BRACKET_QUINELLA:
      return isUnorderedPair(selections, firstFinisher.bracketNumber, secondFinisher.bracketNumber);

    case BET_TYPES.TRIO:
      return isDistinctSubsetOfTop3(selections, 3, finishers);

    case BET_TYPES.TRIFECTA:
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
  return JSON.stringify([...numbers].sort(asc));
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

/** 出走状態の判定に必要な最小限の出走情報 */
export interface EntryStatusInfo {
  status: string;
  horseNumber: number | null;
  bracketNumber: number | null;
}

/** 返還判定に使う、返還対象の馬番と枠連で有効な枠番の組 */
export interface InvalidSelections {
  invalidHorseIds: Set<number>;
  validBrackets: Set<number>;
}

/** 出走状態から、返還対象となる馬番と枠連で有効な枠番を求める。馬番や枠番が未設定の出走は集合に含めない */
export function resolveInvalidSelections(entries: EntryStatusInfo[]): InvalidSelections {
  const invalidHorseIds = new Set(
    entries
      .filter((e) => e.status === 'SCRATCHED' || e.status === 'EXCLUDED')
      .map((e) => e.horseNumber)
      .filter((n): n is number => n !== null)
  );

  const validBrackets = new Set(
    entries
      .filter((e) => e.status === 'ENTRANT')
      .map((e) => e.bracketNumber)
      .filter((b): b is number => b !== null)
  );

  return { invalidHorseIds, validBrackets };
}

export function calculatePayoutRate(
  totalPool: number,
  winningAmount: number,
  totalWinningAmount: number,
  winningCount = 1
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
  if (finishers.length < REQUIRED_FINISHERS[type]) return [];

  const firstFinisher = finishers[0];
  const secondFinisher = finishers[1];
  const thirdFinisher = finishers[2];

  switch (type) {
    case BET_TYPES.WIN:
      return [[firstFinisher.horseNumber]];

    case BET_TYPES.PLACE:
      return finishers.slice(0, 3).map((f) => [f.horseNumber]);

    case BET_TYPES.QUINELLA:
      return [[firstFinisher.horseNumber, secondFinisher.horseNumber].sort(asc)];

    case BET_TYPES.EXACTA:
      return [[firstFinisher.horseNumber, secondFinisher.horseNumber]];

    case BET_TYPES.WIDE: {
      const top3 = finishers.slice(0, 3).map((f) => f.horseNumber);
      const combos: number[][] = [[top3[0], top3[1]].sort(asc)];
      if (top3.length >= 3) {
        combos.push([top3[0], top3[2]].sort(asc));
        combos.push([top3[1], top3[2]].sort(asc));
      }
      return combos;
    }

    case BET_TYPES.BRACKET_QUINELLA:
      return [[firstFinisher.bracketNumber, secondFinisher.bracketNumber].sort(asc)];

    case BET_TYPES.TRIO:
      return [[firstFinisher.horseNumber, secondFinisher.horseNumber, thirdFinisher.horseNumber].sort(asc)];

    case BET_TYPES.TRIFECTA:
      return [[firstFinisher.horseNumber, secondFinisher.horseNumber, thirdFinisher.horseNumber]];

    default:
      return [];
  }
}
