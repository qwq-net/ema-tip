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

// JRA の掲載順に合わせる。3連複が3連単より先
export const BET_TYPE_ORDER = [
  BET_TYPES.WIN,
  BET_TYPES.PLACE,
  BET_TYPES.BRACKET_QUINELLA,
  BET_TYPES.QUINELLA,
  BET_TYPES.WIDE,
  BET_TYPES.EXACTA,
  BET_TYPES.TRIO,
  BET_TYPES.TRIFECTA,
] as const;

export type BetType = (typeof BET_TYPES)[keyof typeof BET_TYPES];

// JRA の公式表記に合わせ、3連系はアラビア数字で統一する
export const BET_TYPE_LABELS = {
  [BET_TYPES.WIN]: '単勝',
  [BET_TYPES.PLACE]: '複勝',
  [BET_TYPES.BRACKET_QUINELLA]: '枠連',
  [BET_TYPES.QUINELLA]: '馬連',
  [BET_TYPES.WIDE]: 'ワイド',
  [BET_TYPES.EXACTA]: '馬単',
  [BET_TYPES.TRIFECTA]: '3連単',
  [BET_TYPES.TRIO]: '3連複',
} satisfies Record<BetType, string>;

// 券種セレクタの下に出す1行説明。的中条件だけを書き、点数や買い方には触れない
export const BET_TYPE_DESCRIPTIONS = {
  [BET_TYPES.WIN]: '1着になる馬を当てる',
  [BET_TYPES.PLACE]: '3着までに入る馬を当てる',
  [BET_TYPES.BRACKET_QUINELLA]: '1着と2着の枠番の組合せを当てる。順番は問わない',
  [BET_TYPES.QUINELLA]: '1着と2着の馬の組合せを当てる。順番は問わない',
  [BET_TYPES.WIDE]: '3着までに入る2頭の組合せを当てる',
  [BET_TYPES.EXACTA]: '1着と2着の馬を着順どおりに当てる',
  [BET_TYPES.TRIFECTA]: '1着・2着・3着の馬を着順どおりに当てる',
  [BET_TYPES.TRIO]: '3着までに入る3頭の組合せを当てる。順番は問わない',
} satisfies Record<BetType, string>;

export const BET_TYPE_SELECTION_COUNTS = {
  [BET_TYPES.WIN]: 1,
  [BET_TYPES.PLACE]: 1,
  [BET_TYPES.BRACKET_QUINELLA]: 2,
  [BET_TYPES.QUINELLA]: 2,
  [BET_TYPES.WIDE]: 2,
  [BET_TYPES.EXACTA]: 2,
  [BET_TYPES.TRIFECTA]: 3,
  [BET_TYPES.TRIO]: 3,
} satisfies Record<BetType, number>;

export interface BetDetail {
  type: BetType;
  selections: number[];
}
