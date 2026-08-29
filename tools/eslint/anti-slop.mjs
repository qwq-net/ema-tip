// vendored な anti-slop（oxlint プラグイン）を ESLint プラグインへ変換するアダプタ。
// eslint.config.ts から jiti 経由でロードされる前提。素の Node からは .ts import のため読めない。
import antiSlop from './anti-slop/index.ts';

// 識別子がグローバル参照かを返す。oxlint 拡張 API `SourceCode#isGlobalReference` の互換実装。
// スコープチェーンで解決できない、または定義を持たないグローバル変数（組み込みの Reflect 等）なら true。
function isGlobalReference(sourceCode, identifier) {
  let scope = sourceCode.getScope(identifier);
  while (scope) {
    const variable = scope.set.get(identifier.name);
    if (variable) return scope.type === 'global' && variable.defs.length === 0;
    scope = scope.upper;
  }
  return true;
}

// oxlint ルールを ESLint ルールに変換する。
// oxlint の createOnce はファイル横断で1回だが、ESLint は create をファイルごとに呼ぶため
// クロージャ状態が毎ファイル初期化される。これは createOnce の状態リセット前提と両立する。
function toEslintRule(rule) {
  return {
    meta: rule.meta,
    create(context) {
      const { sourceCode } = context;
      if (typeof sourceCode.isGlobalReference !== 'function') {
        sourceCode.isGlobalReference = (node) => isGlobalReference(sourceCode, node);
      }
      return rule.createOnce(context);
    },
  };
}

export default {
  meta: antiSlop.meta,
  rules: Object.fromEntries(Object.entries(antiSlop.rules).map(([name, rule]) => [name, toEslintRule(rule)])),
};
