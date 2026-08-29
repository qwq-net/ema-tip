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

// typescript-eslint の AST ノード・コメントには oxlint と違い start / end プロパティが無いため、
// range から補完する。anti-slop のルールはコメント位置比較などで start / end を参照する。
// SourceCode 自体は拡張不可のことがあるため処理済み管理は WeakSet で行う
const offsetsDone = new WeakSet();

function ensureOffsets(sourceCode) {
  if (offsetsDone.has(sourceCode)) return;
  offsetsDone.add(sourceCode);
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.start === undefined && Array.isArray(node.range) && Object.isExtensible(node)) {
      node.start = node.range[0];
      node.end = node.range[1];
    }
    const keys = sourceCode.visitorKeys[node.type] ?? Object.keys(node);
    for (const key of keys) {
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) visit(item);
      } else if (child && typeof child === 'object') {
        visit(child);
      }
    }
  };
  visit(sourceCode.ast);
  for (const comment of sourceCode.getAllComments()) {
    if (comment.start === undefined && Array.isArray(comment.range) && Object.isExtensible(comment)) {
      comment.start = comment.range[0];
      comment.end = comment.range[1];
    }
  }
}

// ESLint に無い oxlint 拡張 API を SourceCode の変異なしで足すための Proxy。
// メソッドは実体に bind して返し、SourceCode 内部の private field 参照を壊さない
function withCompatSourceCode(context) {
  const target = context.sourceCode;
  if (typeof target.isGlobalReference === 'function') return context;
  const compatSourceCode = new Proxy(target, {
    get(sourceCode, prop) {
      if (prop === 'isGlobalReference') return (node) => isGlobalReference(sourceCode, node);
      const value = Reflect.get(sourceCode, prop, sourceCode);
      return typeof value === 'function' ? value.bind(sourceCode) : value;
    },
  });
  return new Proxy(context, {
    get(ctx, prop) {
      if (prop === 'sourceCode') return compatSourceCode;
      const value = Reflect.get(ctx, prop, ctx);
      return typeof value === 'function' ? value.bind(ctx) : value;
    },
  });
}

// oxlint ルールを ESLint ルールに変換する。
// oxlint の createOnce はファイル横断で1回だが、ESLint は create をファイルごとに呼ぶため
// クロージャ状態が毎ファイル初期化される。これは createOnce の状態リセット前提と両立する。
function toEslintRule(rule) {
  return {
    meta: rule.meta,
    create(context) {
      ensureOffsets(context.sourceCode);
      return rule.createOnce(withCompatSourceCode(context));
    },
  };
}

export default {
  meta: antiSlop.meta,
  rules: Object.fromEntries(Object.entries(antiSlop.rules).map(([name, rule]) => [name, toEslintRule(rule)])),
};
