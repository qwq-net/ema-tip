// 絵文字パスワードの入力と検証で毎回作り直さないようモジュールスコープへ置く。
// 書記素の境界はロケールに依存しないためロケール引数は渡さない
const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** 文字列を人が 1 文字と認識する単位で分割する。結合絵文字や肌の色の修飾も 1 要素にまとまる */
export function splitGraphemes(text: string): string[] {
  return Array.from(GRAPHEME_SEGMENTER.segment(text), (s) => s.segment);
}
