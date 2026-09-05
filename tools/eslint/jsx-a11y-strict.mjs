// eslint-plugin-jsx-a11y は型定義を同梱せず、eslint.config.ts から直接読むと型なし値の参照になる。
// ルール名の取り出しだけをこのアダプタへ寄せ、設定側は型の付いたオブジェクトを受け取る。
// eslint.config.ts から jiti 経由でロードされる前提。
import jsxA11y from 'eslint-plugin-jsx-a11y';

/**
 * jsx-a11y の strict 設定が有効にしているルールだけを error にした対応表を返す。
 * プラグインが off で配るルールは含めない。更新で off が増えても CI が理由なく落ちない。
 * 個別に緩めたいものは呼び出し側でこの展開より後ろに書いて上書きする。
 * @returns {Record<string, 'error'>} ルール名から 'error' への対応表
 */
export function jsxA11yStrictRules() {
  return Object.fromEntries(
    Object.entries(jsxA11y.flatConfigs.strict.rules)
      .filter(([, severity]) => severity !== 'off' && severity !== 0)
      .map(([name]) => [name, 'error'])
  );
}
