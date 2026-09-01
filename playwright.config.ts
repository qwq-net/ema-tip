import { defineConfig } from '@playwright/test';

// E2E は app / db / redis からなる起動済みの docker compose 環境へ外から接続する。
// ブラウザはリポジトリの node_modules ではなく Playwright 公式イメージ側のものを使うため、
// @playwright/test のバージョンと docker-compose.override.yml のイメージタグは一致させること
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 0,
  // DB に共有フィクスチャを作るため並列実行しない
  workers: 1,
  reporter: [['list']],
  use: {
    // localhost 以外のホスト名は Chromium が http を https へ自動昇格して接続不能になるため、
    // e2e サービスは app とネットワーク名前空間を共有し localhost で到達する
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    locale: 'ja-JP',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
