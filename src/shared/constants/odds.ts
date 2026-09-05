import { BET_TYPES } from '@/entities/bet/constants';

export const DEFAULT_GUARANTEED_ODDS = {
  [BET_TYPES.WIN]: 3.5,
  [BET_TYPES.PLACE]: 1.5,
  [BET_TYPES.BRACKET_QUINELLA]: 8.0,
  [BET_TYPES.QUINELLA]: 15.0,
  [BET_TYPES.WIDE]: 5.0,
  [BET_TYPES.EXACTA]: 30.0,
  [BET_TYPES.TRIFECTA]: 200.0,
  [BET_TYPES.TRIO]: 40.0,
} as const;
