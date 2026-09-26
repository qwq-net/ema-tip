export const FORECAST_SYMBOLS = ['◎', '◯', '▲', '△', '☆', '注', '✕', '消'] as const;

// ◎〜△は一般的な競馬新聞の呼び名。独自の印はこの画面での目安を示す。
export const FORECAST_SYMBOL_MEANINGS = {
  '◎': '本命',
  '◯': '対抗',
  '▲': '単穴',
  '△': '連下',
  '☆': '穴',
  注: '注目',
  '✕': '抑え',
  消: '対象外',
} satisfies Record<(typeof FORECAST_SYMBOLS)[number], string>;
