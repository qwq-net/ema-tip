import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // e2e/ 配下は Playwright 管轄のため vitest の収集対象から外す
    include: ['src/**/*.test.{ts,tsx}'],
    // 定型モックの一括定義。内容は vitest.setup.ts を参照
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
