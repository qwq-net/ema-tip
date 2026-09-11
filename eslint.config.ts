import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import sonarjs, { configs as sonarjsConfigs } from 'eslint-plugin-sonarjs';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import antiSlop from './tools/eslint/anti-slop.mjs';
import { sliceNames } from './tools/eslint/feature-slices.mjs';
import { jsxA11yStrictRules } from './tools/eslint/jsx-a11y-strict.mjs';

// CLI として手で実行する保守スクリプト。進行状況を標準出力へ流すため console.log を許可する
const cliScripts = [
  'src/shared/db/seed.ts',
  'src/shared/db/reset.ts',
  'src/shared/db/set-role.ts',
  'src/shared/db/reconcile.ts',
  'src/shared/lib/reset-redis.ts',
];

const testFiles = ['**/*.test.ts', '**/*.test.tsx', 'vitest.setup.ts', 'e2e/**/*.ts'];

// features のスライス一覧はディレクトリから導出する。手書きの台帳を置くと実体とずれる
const featureSlices = sliceNames('features');
const noAppImport = { regex: '^@/app/', message: 'features から app は参照できません' };
const noWidgetImport = { regex: '^@/widgets/', message: 'widgets を参照できるのは app だけです' };

// 見た目の規約を文章ではなく構造で守る。部品を迂回する書き方を lint で止め、代わりの部品を示す。
// no-restricted-syntax は後のブロックが前の指定を置き換えるため、各ブロックで必要な群をすべて並べる
const baseSyntax = [
  {
    selector: 'TSEnumDeclaration',
    message: 'enum ではなく as const の配列とユニオン型を使います',
  },
  {
    selector: 'ForInStatement',
    message: 'for-in ではなく Object.keys や Object.entries を使います',
  },
];
// 見出しと表は shared/ui の部品しか使わない。文字サイズと余白の揺れがここから出るため。
// button と select と input は対象外。キーパッドやピル型トグルのような独自操作が features に多く、
// Button の variant へ寄せると className の上書きの方が長くなる。a11y は jsx-a11y が見る
const semanticElementSyntax = [
  {
    selector: 'JSXOpeningElement > JSXIdentifier[name=/^(h1|h2|h3|table)$/]',
    message:
      '生の見出しと表ではなく shared/ui の部品を使います。h1 は PageHeader か AdminPageHeader、h2 と h3 は SectionTitle か CardTitle、table は Table か TableShell',
  },
];
// app 層は部品を並べるだけにする。見た目の判断を page に書かせない
const appLayerSyntax = (hostSelector: string) => [
  {
    selector: hostSelector,
    message: 'app 層は部品を組み立てるだけです。生の要素は shared/ui か features か widgets の部品へ移します',
  },
  {
    selector: 'JSXAttribute[name.name="className"]',
    message: 'app 層では className を渡しません。見た目は部品の props で決めます',
  },
];
const hostElement = 'JSXOpeningElement > JSXIdentifier[name=/^[a-z]/]';
// root layout だけは html と body を書く
const hostElementExceptDocument = 'JSXOpeningElement > JSXIdentifier[name=/^(?!html$|body$)[a-z]/]';

// 運用方針。ルールの採否とその理由はこのファイルのコメントが正本で、CLAUDE.md には書かない。
// - warning は使わない。lint は --max-warnings 0 で、新しいルールは warn で入れて既存違反を潰し、
//   0 件になった時点で error へ昇格する。複雑度などの閾値は上げず、超過したら関数を分ける
// - eslint-disable は理由付きの行単位だけ。ファイル単位の無効化はしない。不要になった指定は
//   reportUnusedDisableDirectives が検出する
// - import/no-cycle は不採用。2026-09 の計測で循環は 0 件だったが、host の node_modules は
//   alpine 向けバインディングしか無く、@/ の解決で ESLint 全体が落ちて VSCode の拡張も使えなくなる。
//   再計測はコンテナ内で pnpm exec eslint src e2e --rule 'import/no-cycle: warn'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // tools は vendored の anti-slop 本体なので上流の形のまま置く。.claude はエージェント設定で成果物ではない
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'tools/**', '.claude/**', 'tmp/**']),
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
      // 券種やステータスのユニオンに対する switch で分岐漏れを検出する。
      // default があっても網羅性を要求し、ユニオンが増えたときに更新漏れを落とす
      '@typescript-eslint/switch-exhaustiveness-check': ['error', { considerDefaultExhaustiveForUnions: true }],
      // 型だけの import を import type に固定する。バンドルへ実体が残らず循環参照も起きにくくなる。
      // インラインの import() 型注釈は vi.mock の importOriginal で必要なため禁止しない
      '@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
    },
  },
  // eslint-config-next は自身のルールを warn で配る。この製品は警告と失敗を分けない方針なので
  // すべて error へ引き上げる。違反は 0 件で、--max-warnings 0 を外しても検査が緩まなくなる
  {
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/incompatible-library': 'error',
      'react-hooks/unsupported-syntax': 'error',
      '@next/next/google-font-display': 'error',
      '@next/next/google-font-preconnect': 'error',
      '@next/next/next-script-for-ga': 'error',
      '@next/next/no-async-client-component': 'error',
      '@next/next/no-before-interactive-script-outside-document': 'error',
      '@next/next/no-css-tags': 'error',
      '@next/next/no-head-element': 'error',
      '@next/next/no-img-element': 'error',
      '@next/next/no-page-custom-font': 'error',
      '@next/next/no-styled-jsx-in-document': 'error',
      '@next/next/no-title-in-document-head': 'error',
      '@next/next/no-typos': 'error',
      '@next/next/no-unwanted-polyfillio': 'error',
      'import/no-anonymous-default-export': 'error',
      'jsx-a11y/alt-text': ['error', { elements: ['img'], img: ['Image'] }],
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
    },
  },
  // eslint-config-next が有効にする jsx-a11y は 6 ルールだけなので、strict の全ルールを上に重ねる。
  // 上の引き上げブロックより後ろに置いて後勝ちさせるため、alt-text のオプションはここで指定し直す
  {
    files: ['**/*.tsx'],
    rules: {
      ...jsxA11yStrictRules(),
      'jsx-a11y/alt-text': ['error', { elements: ['img'], img: ['Image'] }],
      // label-has-for はプラグイン自身が非推奨とし、役割を label-has-associated-control へ移した。
      // 併用すると同じ label へ二重に指摘が出るため後継だけを残す
      'jsx-a11y/label-has-for': 'off',
      // アイコンだけのボタンは alt-text も label-has-associated-control も名前を見ないため、
      // このルールが唯一の検出手段になる。既定の深さでは入れ子のテキストを辿れず誤検出が出るので
      // depth を 3 まで広げる。プラグインは strict でもこれを off で配るため明示的に有効化する
      'jsx-a11y/control-has-associated-label': ['error', { depth: 3 }],
      // Checkbox は shared/ui の素の input[type=checkbox] ラッパで、label で包めば関連付けが成立する。
      // 独自コンポーネント名をコントロールとして認識させる
      'jsx-a11y/label-has-associated-control': ['error', { controlComponents: ['Checkbox'] }],
      // form は暗黙送信という鍵盤操作を元から持つ要素で、Enter による誤送信を抑える onKeyDown は
      // その調整にあたる。偽のウィジェットを作る用途ではないため form の onKeyDown だけ許可する
      'jsx-a11y/no-noninteractive-element-interactions': ['error', { form: ['onKeyDown'] }],
    },
  },
  {
    plugins: { 'anti-slop': antiSlop, sonarjs },
    rules: {
      // sonarjs の recommended。バグ検出とコードスメル 217 ルールを error で取り込む。
      // 個別指定は必ずこの展開より後ろへ置いて後勝ちさせる
      ...sonarjsConfigs.recommended.rules,

      // React の props を readonly にする様式の統一。欠陥ではなく好みの範囲で、
      // 適用すると 133 箇所の型注釈を書き換えることになるため採用しない
      'sonarjs/prefer-read-only-props': 'off',
      // Math.random の指摘。該当は開発用シーダの乱数と SSE のクライアント識別子だけで、
      // どちらも暗号や認証の用途ではない。乱数の質が安全性に影響しないため検査しない
      'sonarjs/pseudo-random': 'off',

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
      'no-restricted-syntax': ['error', ...baseSyntax],
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
            {
              regex: '^@/(features|widgets|app)/',
              message: 'shared から features と widgets と app は参照できません',
            },
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
          patterns: [
            {
              regex: '^@/(features|widgets|app)/',
              message: 'entities から features と widgets と app は参照できません',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [noAppImport, noWidgetImport] }],
    },
  },
  // features のスライス同士は参照し合わない。共有したくなったものは entities か shared へ下ろす。
  // no-restricted-imports は「自分以外のスライス」を 1 つの pattern で表せないため、
  // スライスごとにブロックを分けて自分以外を regex で禁じる。
  // 同じルールを後のブロックで指定すると前の指定を置き換えるので、app の禁止もここへ含める
  ...featureSlices.map((slice) => ({
    files: [`src/features/${slice}/**`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            noAppImport,
            noWidgetImport,
            {
              regex: `^@/features/(?!${slice}(/|$))`,
              message: `features/${slice} から他のスライスは参照できません。共有する処理は entities か shared へ移します`,
            },
          ],
        },
      ],
    },
  })),
  // widgets は複数の features を組み合わせる層。app からだけ参照され、スライス同士は参照しない
  ...sliceNames('widgets').map((slice) => ({
    files: [`src/widgets/${slice}/**`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { regex: '^@/app/', message: 'widgets から app は参照できません' },
            {
              regex: `^@/widgets/(?!${slice}(/|$))`,
              message: `widgets/${slice} から他の widgets は参照できません。共有する処理は features か shared へ移します`,
            },
          ],
        },
      ],
    },
  })),
  // 生要素の禁止。shared/ui だけが素の見出しと表を書ける
  {
    files: ['src/features/**/*.tsx', 'src/entities/**/*.tsx', 'src/widgets/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...baseSyntax, ...semanticElementSyntax],
    },
  },
  {
    files: ['src/app/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...baseSyntax, ...semanticElementSyntax, ...appLayerSyntax(hostElement)],
    },
  },
  {
    // global-error は root layout を置き換えるため、Next.js の仕様として html と body を自前で持つ
    files: ['src/app/layout.tsx', 'src/app/global-error.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...baseSyntax,
        ...semanticElementSyntax,
        ...appLayerSyntax(hostElementExceptDocument),
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
