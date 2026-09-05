import type { BetType } from '../constants';
import { BET_TYPES } from '../constants';

/**
 * 選択列を 1 列ずつ辿り、各列から 1 つずつ選んだ組をすべて返す。
 * 列が 1 つも無いか、値が 1 つも無い列があれば組は作れないため空配列を返す。
 */
export function generateCombinations(selections: number[][]): number[][] {
  if (selections.length === 0) return [];
  if (selections.some((s) => s.length === 0)) return [];

  const result: number[][] = [];

  function backtrack(index: number, current: number[]) {
    const row = selections[index];
    if (row === undefined) {
      result.push([...current]);
      return;
    }
    for (const num of row) {
      current.push(num);
      backtrack(index + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}

/** 生成済みの組から、券種として成立しないものと重複を除く */
export function filterValidCombinations(
  combinations: number[][],
  betType: BetType,
  bracketHorseCount?: Map<number, number>
): number[][] {
  switch (betType) {
    case BET_TYPES.WIN:
    case BET_TYPES.PLACE:
      return combinations;

    case BET_TYPES.QUINELLA:
    case BET_TYPES.WIDE:
      return filterQuinellaAndWide(combinations);

    case BET_TYPES.BRACKET_QUINELLA:
      return filterBracketQuinella(combinations, bracketHorseCount);

    case BET_TYPES.EXACTA:
      return filterExacta(combinations);

    case BET_TYPES.TRIFECTA:
      return filterTrifecta(combinations);

    case BET_TYPES.TRIO:
      return filterTrio(combinations);

    default:
      return combinations;
  }
}

/** 馬単の組から、1 着と 2 着に同じ馬番を置いた成立しない組を除く */
function filterExacta(combinations: number[][]): number[][] {
  return combinations.filter((combo) => {
    const [a, b] = combo;
    return a !== b;
  });
}

/** 馬連とワイドの組から、同じ馬番の重複と順序違いの重複を除く */
function filterQuinellaAndWide(combinations: number[][]): number[][] {
  const seen = new Set<string>();
  return combinations.filter((combo) => {
    const [a, b] = combo;
    if (a === b) return false;

    const key = combo
      .slice(0, 2)
      .sort((x, y) => x - y)
      .join('-');

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 枠連の組から、順序違いの重複を除く。
 * 同じ枠を 2 つ選んだゾロ目は、その枠に 2 頭以上いるときだけ成立する。
 * 枠番が 1 つも無い組は判定材料が無いため除く。
 */
function filterBracketQuinella(combinations: number[][], bracketHorseCount?: Map<number, number>): number[][] {
  const seen = new Set<string>();
  return combinations.filter((combo) => {
    const [a, b] = combo;
    if (a === undefined) return false;

    if (a === b) {
      const count = bracketHorseCount?.get(a) ?? 0;
      if (count < 2) return false;
    }

    const key = combo
      .slice(0, 2)
      .sort((x, y) => x - y)
      .join('-');

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 3 連単の組から、同じ馬番を 2 つ以上含む成立しない組を除く */
function filterTrifecta(combinations: number[][]): number[][] {
  return combinations.filter((combo) => {
    const [a, b, c] = combo;
    return a !== b && b !== c && a !== c;
  });
}

/** 3 連複の組から、同じ馬番の重複と順序違いの重複を除く */
function filterTrio(combinations: number[][]): number[][] {
  const seen = new Set<string>();
  return combinations.filter((combo) => {
    const [a, b, c] = combo;
    if (a === b || b === c || a === c) return false;

    const key = combo
      .slice(0, 3)
      .sort((x, y) => x - y)
      .join('-');

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateSelections(selections: number[][]): number[][] {
  return selections.map((row) => Array.from(new Set(row)));
}

/** 選択列と券種から、実際に成立する買い目の点数を返す。重複と成立しない組は除いた数になる */
export function calculateBetCount(
  selections: number[][],
  betType: BetType,
  bracketHorseCount?: Map<number, number>
): number {
  if (betType === BET_TYPES.WIN || betType === BET_TYPES.PLACE) {
    const [first] = selections;
    if (first === undefined || first.length === 0) return 0;
    return new Set(first).size;
  }

  const uniqueSelections = deduplicateSelections(selections);
  const allCombos = generateCombinations(uniqueSelections);
  const validCombos = filterValidCombinations(allCombos, betType, bracketHorseCount);
  return validCombos.length;
}

/** 選択列と券種から、実際に成立する買い目の組を返す。重複と成立しない組は除かれる */
export function getValidBetCombinations(
  selections: number[][],
  betType: BetType,
  bracketHorseCount?: Map<number, number>
): number[][] {
  if (betType === BET_TYPES.WIN || betType === BET_TYPES.PLACE) {
    const [first] = selections;
    if (first === undefined) return [];
    const distinct = Array.from(new Set(first)).sort((a, b) => a - b);
    return distinct.map((num) => [num]);
  }

  const uniqueSelections = deduplicateSelections(selections);
  const allCombos = generateCombinations(uniqueSelections);
  return filterValidCombinations(allCombos, betType, bracketHorseCount);
}
