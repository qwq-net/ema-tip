export const BET_TYPES = {
  WIN: 'win',
  PLACE: 'place',
  BRACKET_QUINELLA: 'bracket_quinella',
  QUINELLA: 'quinella',
  WIDE: 'wide',
  EXACTA: 'exacta',
  TRIFECTA: 'trifecta',
  TRIO: 'trio',
} as const;

export const BET_TYPE_ORDER = [
  BET_TYPES.WIN,
  BET_TYPES.PLACE,
  BET_TYPES.BRACKET_QUINELLA,
  BET_TYPES.QUINELLA,
  BET_TYPES.WIDE,
  BET_TYPES.EXACTA,
  BET_TYPES.TRIFECTA,
  BET_TYPES.TRIO,
] as const;

export type BetType = (typeof BET_TYPES)[keyof typeof BET_TYPES];

export const BET_TYPE_LABELS: Record<BetType, string> = {
  [BET_TYPES.WIN]: '単勝',
  [BET_TYPES.PLACE]: '複勝',
  [BET_TYPES.BRACKET_QUINELLA]: '枠連',
  [BET_TYPES.QUINELLA]: '馬連',
  [BET_TYPES.WIDE]: 'ワイド',
  [BET_TYPES.EXACTA]: '馬単',
  [BET_TYPES.TRIFECTA]: '三連単',
  [BET_TYPES.TRIO]: '三連複',
};

export const BET_TYPE_SELECTION_COUNTS: Record<BetType, number> = {
  [BET_TYPES.WIN]: 1,
  [BET_TYPES.PLACE]: 1,
  [BET_TYPES.BRACKET_QUINELLA]: 2,
  [BET_TYPES.QUINELLA]: 2,
  [BET_TYPES.WIDE]: 2,
  [BET_TYPES.EXACTA]: 2,
  [BET_TYPES.TRIFECTA]: 3,
  [BET_TYPES.TRIO]: 3,
};

export interface BetDetail {
  type: BetType;
  selections: number[];
}
