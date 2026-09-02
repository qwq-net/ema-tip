export const RACE_SURFACES = ['芝', 'ダート'] as const;
export const RACE_CONDITIONS = ['良', '稍重', '重', '不良'] as const;
export const RACE_TYPES = ['REAL', 'FICTIONAL'] as const;
export const RACE_GRADES = ['G1', 'G2', 'G3', 'L', 'OP', '3_WIN', '2_WIN', '1_WIN', 'MAIDEN', 'NEWCOMER'] as const;
export const VENUE_DIRECTIONS = ['LEFT', 'RIGHT', 'STRAIGHT'] as const;
export const VENUE_AREAS = ['EAST_JAPAN', 'WEST_JAPAN', 'OVERSEAS'] as const;

export const DIRECTION_LABELS = {
  LEFT: '左回り',
  RIGHT: '右回り',
  STRAIGHT: '直線',
} satisfies Record<(typeof VENUE_DIRECTIONS)[number], string>;
