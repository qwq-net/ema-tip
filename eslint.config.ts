import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { defineConfig, globalIgnores } from 'eslint/config';
import antiSlop from './tools/eslint/anti-slop.mjs';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'tools/**', '.claude/**']),
  {
    plugins: { 'anti-slop': antiSlop },
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
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    // vi.mock ベースの unit テスト戦略とモック型付けの慣行（as unknown as 等）に衝突するため、
    // テストファイルではモック関連ルールを無効化する
    rules: {
      'anti-slop/no-module-mocking': 'off',
      'anti-slop/require-safety-comment-for-type-assertion': 'off',
      'anti-slop/no-chained-type-assertions': 'off',
      'anti-slop/no-unsafe-dictionary-type': 'off',
    },
  },
]);

export default eslintConfig;
