import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import sonarjs from 'eslint-plugin-sonarjs';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import antiSlop from './tools/eslint/anti-slop.mjs';

// CLI として手で実行する保守スクリプト。進行状況を標準出力へ流すため console.log を許可する
const cliScripts = [
  'src/shared/db/seed.ts',
  'src/shared/db/reset.ts',
  'src/shared/db/set-role.ts',
  'src/shared/db/reconcile.ts',
  'src/shared/lib/reset-redis.ts',
];

const testFiles = ['**/*.test.ts', '**/*.test.tsx', 'vitest.setup.ts', 'e2e/**/*.ts'];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // tools は vendored の anti-slop 本体なので上流の形のまま置く。.claude はエージェント設定で成果物ではない
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'tools/**', '.claude/**']),
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
  {
    // 型情報を使うルール群。eslint.config.ts は tsconfig の対象外なので既定プロジェクトで解析する。
    // tsconfigRootDir は指定しない。値に使う import.meta.dirname が既定プロジェクトでは any になり
    // no-unsafe-assignment を踏むため。projectService はこのファイルの位置から root を推論するので、
    // 未指定でもサブディレクトリからの実行やエディタ統合で型情報は効く
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.ts'] },
      },
    },
    rules: {
      // form action へ async 関数を渡すのは Next.js で正当なため、JSX 属性は検査しない
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      // onClick={() => setOpen(false)} の省略形を許可する
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      // 金額や頭数をそのまま文字列へ埋め込む書き方が全体で定着しているため数値は許可する
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // 文字列の空文字は未設定を意味する表示フォールバックとして定着しているため検査しない。
      // race.condition || '良' のような既定値が ?? では空欄になり表示が壊れる
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: { string: true, number: false, boolean: false, bigint: false } },
      ],
      // tsconfig の noUncheckedIndexedAccess が無効な間は健全に働かないため使わない。
      // 配列と Record の添字アクセスが常に値を返す型になり、finishers[0] の存在チェックや
      // acc[key] の初期化ガードを不要と誤判定する。的中判定のガードを消すと払戻が壊れる。
      // 添字アクセスを厳格化したら有効化する。その時点で誤検知 55 件が消え、実質の指摘 77 件が残る。
      // ただし noUncheckedIndexedAccess を有効にすると tsc エラーが約 225 件出るため、その解消とセットで進める
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
  {
    plugins: { 'anti-slop': antiSlop, sonarjs },
    rules: {
      'anti-slop/no-chained-type-assertions': 'error',
      'anti-slop/no-conditional-empty-object-spread': 'error',
      'anti-slop/no-known-value-widening': 'error',
      'anti-slop/no-module-mocking': 'error',
      'anti-slop/no-object-parameters': 'error',
      'anti-slop/no-reflect-apply': 'error',
      'anti-slop/no-reflect-get': 'error',
      'anti-slop/no-runtime-typeof': 'error',
      'anti-slop/no-shape-in-symbol-names': 'error',
      'anti-slop/no-unknown-parameters': 'error',
      'anti-slop/no-unknown-returns': 'error',
      'anti-slop/no-unknown-type-aliases': 'error',
      'anti-slop/no-unsafe-dictionary-type': 'error',
      'anti-slop/no-widen-then-assert': 'error',
      'anti-slop/require-safety-comment-for-type-assertion': 'error',

      // 構造。読みづらさの判定は cognitive-complexity が担い、complexity は粗い網
      complexity: ['error', 15],
      'sonarjs/cognitive-complexity': ['error', 15],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
      'max-nested-callbacks': ['error', 3],

      // 記法
      eqeqeq: ['error', 'always'],
      'no-implicit-coercion': 'error',
      'prefer-template': 'error',
      'no-nested-ternary': 'error',
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'enum ではなく as const の配列とユニオン型を使います',
        },
        {
          selector: 'ForInStatement',
          message: 'for-in ではなく Object.keys や Object.entries を使います',
        },
      ],
    },
  },
  // FSD の層方向。下位層から上位層を参照しない。
  // shared から entities は、UI や DB に依存しない葉モジュールの constants と types だけ参照できる。
  // 検査対象は @/ エイリアスの静的 import のみで、相対パスと動的 import は見ない。現状どちらも層を越えていない
  {
    files: ['src/shared/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@/entities/(?![a-z0-9-]+/(constants|types)$)',
              message: 'shared から entities は constants と types のみ参照できます',
            },
            { regex: '^@/(features|app)/', message: 'shared から features と app は参照できません' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/entities/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ regex: '^@/(features|app)/', message: 'entities から features と app は参照できません' }],
        },
      ],
    },
  },
  {
    files: ['src/features/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ regex: '^@/app/', message: 'features から app は参照できません' }] },
      ],
    },
  },
  {
    files: cliScripts,
    rules: { 'no-console': 'off' },
  },
  {
    files: testFiles,
    // vi.mock ベースの unit テスト戦略、as unknown as によるモック型付け、
    // モックの戻り値を非 null として読む書き方に衝突するため、これらのルールを無効化する。
    // e2e/ のヘルパも同じ扱いにしている
    rules: {
      'anti-slop/no-module-mocking': 'off',
      'anti-slop/require-safety-comment-for-type-assertion': 'off',
      'anti-slop/no-chained-type-assertions': 'off',
      'anti-slop/no-unsafe-dictionary-type': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      // describe / it / vi.fn の入れ子はテストの構造そのものなので数えない
      'max-nested-callbacks': 'off',
    },
  },
]);

export default eslintConfig;
