import type { BetDetail, BetType } from '@/entities/bet/constants';
import { BET_TYPES } from '@/entities/bet/constants';

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

/** 2 つの選択が numbers の先頭 2 件と順不同で一致するか。numbers は必要な着順が揃った状態で渡す */
function isUnorderedPair(selections: number[], numbers: number[]): boolean {
  const [first, second] = numbers;
  return (selections[0] === first && selections[1] === second) || (selections[0] === second && selections[1] === first);
}

/** 選択が重複なく size 個あり、すべて上位 3 着の馬番に含まれるか */
function isDistinctSubsetOfTop3(selections: number[], size: number, horses: number[]): boolean {
  if (selections.length !== size) return false;
  if (new Set(selections).size !== size) return false;
  const top3 = horses.slice(0, 3);
  return selections.every((s) => top3.includes(s));
}

/**
 * 1 口のベットが確定着順に対して的中しているかを返す。
 * 券種が必要とする着順が確定していなければ判定できないため不的中として扱う。
 * 判定に使うのは馬番と枠番の先頭数件で、必要な件数は上の長さ検査が保証する。
 */
export function isWinningBet(detail: BetDetail, finishers: Finisher[]): boolean {
  const { type, selections } = detail;

  // 券種が必要とする着順が揃っていなければ判定できない。実行時には着順が足りない状態が
  // 起こりうるため、この 1 箇所で防ぐ。以降の slice はこの検査を前提に読む
  if (finishers.length < REQUIRED_FINISHERS[type]) return false;

  const horses = finishers.map((f) => f.horseNumber);
  const brackets = finishers.map((f) => f.bracketNumber);

  switch (type) {
    case BET_TYPES.WIN:
      return selections[0] === horses[0];

    case BET_TYPES.PLACE:
      return horses.slice(0, 3).some((horse) => horse === selections[0]);

    case BET_TYPES.QUINELLA:
      return isUnorderedPair(selections, horses);

    case BET_TYPES.EXACTA:
      return selections[0] === horses[0] && selections[1] === horses[1];

    case BET_TYPES.WIDE:
      return isDistinctSubsetOfTop3(selections, 2, horses);

    case BET_TYPES.BRACKET_QUINELLA:
      return isUnorderedPair(selections, brackets);

    case BET_TYPES.TRIO:
      return isDistinctSubsetOfTop3(selections, 3, horses);

    case BET_TYPES.TRIFECTA:
      return selections[0] === horses[0] && selections[1] === horses[1] && selections[2] === horses[2];

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

/**
 * normalizeSelections が作ったキーを馬番の配列へ戻す。
 * 順不同の券種は昇順に整列された状態で返るため、キーと配列の対応は往復しても崩れない。
 * 集計キーとして自前で作った文字列だけを渡す前提で、外部から来た文字列は渡さない。
 */
export const parseSelectionKey = (key: string): number[] => {
  // SAFETY: 渡されるのは normalizeSelections が number[] を JSON.stringify した文字列に限られる
  return JSON.parse(key) as number[];
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

/**
 * 券種ごとに、確定着順から的中となる馬番または枠番の組をすべて返す。
 * 券種が必要とする着順が確定していなければ的中の組は存在しないため空配列を返す。
 * 順不同の券種は昇順に整列した組で返り、集計キーの正規化と対応が取れる。
 */
export function getWinningCombinations(type: BetType, finishers: Finisher[]): number[][] {
  if (finishers.length < REQUIRED_FINISHERS[type]) return [];

  const horses = finishers.map((f) => f.horseNumber);
  const brackets = finishers.map((f) => f.bracketNumber);

  switch (type) {
    case BET_TYPES.WIN:
      return [horses.slice(0, 1)];

    case BET_TYPES.PLACE:
      return horses.slice(0, 3).map((horse) => [horse]);

    case BET_TYPES.QUINELLA:
      return [horses.slice(0, 2).sort(asc)];

    case BET_TYPES.EXACTA:
      return [horses.slice(0, 2)];

    case BET_TYPES.WIDE: {
      // 上位 3 着から 2 頭を選ぶ全組を、1 着から順に相手を後ろへ辿って作る
      const top3 = horses.slice(0, 3);
      return top3.flatMap((horse, index) => top3.slice(index + 1).map((other) => [horse, other].sort(asc)));
    }

    case BET_TYPES.BRACKET_QUINELLA:
      return [brackets.slice(0, 2).sort(asc)];

    case BET_TYPES.TRIO:
      return [horses.slice(0, 3).sort(asc)];

    case BET_TYPES.TRIFECTA:
      return [horses.slice(0, 3)];

    default:
      return [];
  }
}
