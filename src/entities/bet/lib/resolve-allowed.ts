import { BET_TYPE_ORDER, type BetType } from '../constants';

/**
 * 種別配列を購入可能リストへ正規化する。
 * BET_TYPE_ORDER の表示順に整列し、重複を除去する。空配列は未設定とみなし null を返す。
 */
export function toAllowedBetTypes(types: BetType[]): BetType[] | null {
  if (types.length === 0) return null;
  const set = new Set(types);
  return BET_TYPE_ORDER.filter((type) => set.has(type));
}

/**
 * 購入可能な馬券種別を優先順位に従って解決する。
 * レース設定 → イベントのデフォルト設定の順に採用し、どちらも未設定なら null を返す。
 * null は全種別購入可を意味する。返り値は BET_TYPE_ORDER の表示順に整列している。
 */
export function resolveAllowedBetTypes(raceTypes: BetType[], eventTypes: BetType[]): BetType[] | null {
  return toAllowedBetTypes(raceTypes) ?? toAllowedBetTypes(eventTypes);
}
