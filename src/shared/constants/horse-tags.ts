export type HorseTagType = 'LEG_TYPE' | 'CHARACTERISTIC' | 'BIOGRAPHY' | 'OTHER';

export const HORSE_TAG_CATEGORIES = {
  LEG_TYPE: '脚質',
  CHARACTERISTIC: '特性',
  BIOGRAPHY: '来歴',
  OTHER: 'その他',
} satisfies Record<HorseTagType, string>;

/** 値が馬タグ種別として妥当かを判定する。フォーム入力など未検証文字列の絞り込みに使う。 */
export function isHorseTagType(value: string): value is HorseTagType {
  return Object.hasOwn(HORSE_TAG_CATEGORIES, value);
}
