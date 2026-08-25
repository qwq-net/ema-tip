export type HorseTagType = 'LEG_TYPE' | 'CHARACTERISTIC' | 'BIOGRAPHY' | 'OTHER';

export const HORSE_TAG_CATEGORIES: Record<HorseTagType, string> = {
  LEG_TYPE: '脚質',
  CHARACTERISTIC: '特性',
  BIOGRAPHY: '来歴',
  OTHER: 'その他',
};
