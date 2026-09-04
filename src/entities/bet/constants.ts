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

// 券種セレクタの下に出す1行説明。初心者向けのやさしい言い回しで的中条件を伝え、点数や買い方には触れない
export const BET_TYPE_DESCRIPTIONS = {
  [BET_TYPES.WIN]: '1着になる馬はどれ？と1頭を選ぶ、いちばん基本の馬券です',
  [BET_TYPES.PLACE]: '選んだ馬が3着までに入れば的中。当てやすい入門向けの馬券です',
  [BET_TYPES.BRACKET_QUINELLA]: '1着・2着に入る枠の組み合わせを当てます。順番はどちらでも大丈夫',
  [BET_TYPES.QUINELLA]: '1着・2着に入る2頭の組み合わせを当てます。順番はどちらでも大丈夫',
  [BET_TYPES.WIDE]: '選んだ2頭が両方とも3着までに入れば的中。順番は気にしなくてOK',
  [BET_TYPES.EXACTA]: '1着・2着を着順どおりに当てます。馬連より難しいぶん配当は大きめ',
  [BET_TYPES.TRIFECTA]: '1着・2着・3着を着順どおりにずばり当てる、最難関で高配当の馬券です',
  [BET_TYPES.TRIO]: '3着までに入る3頭の組み合わせを当てます。順番はどれでも大丈夫',
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
