export const RACE_SURFACES = ['芝', 'ダート'] as const;
export const RACE_CONDITIONS = ['良', '稍重', '重', '不良'] as const;
export const RACE_TYPES = ['REAL', 'FICTIONAL'] as const;
export const RACE_GRADES = ['G1', 'G2', 'G3', 'L', 'OP', '3_WIN', '2_WIN', '1_WIN', 'MAIDEN', 'NEWCOMER'] as const;
export const VENUE_DIRECTIONS = ['LEFT', 'RIGHT', 'STRAIGHT'] as const;
export const VENUE_AREAS = ['EAST_JAPAN', 'WEST_JAPAN', 'OVERSEAS'] as const;

/** 格付けの表示名。一覧とフォームで同じ語を使う。 */
export const RACE_GRADE_LABELS = {
  G1: 'G1',
  G2: 'G2',
  G3: 'G3',
  L: 'リステッド',
  OP: 'オープン',
  '3_WIN': '3勝クラス',
  '2_WIN': '2勝クラス',
  '1_WIN': '1勝クラス',
  MAIDEN: '未勝利',
  NEWCOMER: '新馬',
} satisfies Record<(typeof RACE_GRADES)[number], string>;

/** 種別の表示名。一覧とフォームで同じ語を使う。 */
export const RACE_TYPE_LABELS = {
  REAL: '実在',
  FICTIONAL: '架空',
} satisfies Record<(typeof RACE_TYPES)[number], string>;

export const DIRECTION_LABELS = {
  LEFT: '左回り',
  RIGHT: '右回り',
  STRAIGHT: '直線',
} satisfies Record<(typeof VENUE_DIRECTIONS)[number], string>;
