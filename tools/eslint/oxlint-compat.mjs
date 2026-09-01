// MIT ライセンスの oxlint プラグイン anti-slop https://github.com/dmmulroy/anti-slop を
// ESLint で動かすための最小シム。vendored ソースの import 差し替え先。
// oxlint 側では登録用ラッパーだが、ESLint 実行ではルール定義をそのまま返せば足りる。
// ESTree 等の型 import はロード時に消去されるため runtime エクスポートは不要。

export const defineRule = (rule) => rule;

export const eslintCompatPlugin = (plugin) => plugin;
