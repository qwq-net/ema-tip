import { HORSE_SOURCES, HORSE_TAG_TYPES, HORSE_TYPES } from '@/shared/constants/horse';

export type HorseType = (typeof HORSE_TYPES)[number];
export type HorseTagType = (typeof HORSE_TAG_TYPES)[number];
export type HorseSource = (typeof HORSE_SOURCES)[number];
