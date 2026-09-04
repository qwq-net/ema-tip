import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 生パレット色の直書きを検出する台帳テスト。
 * 色の管理点は globals.css の @theme であり、コンポーネントには gray と turf 以外の
 * 生 Tailwind 色クラスを書かない。慣習色として認めたファイルと、意味色の手組みが
 * 残っている既存ファイルだけを許可し、それ以外での新規使用を CI で落とす。
 * 残置ファイルから直書きが消えたら一覧から外すことも強制し、後戻りを防ぐ。
 */

// 生パレット色クラス。gray と turf は @theme で上書き済みの管理内なので対象外
const RAW_PALETTE_CLASS =
  /(?:bg|text|border|ring|from|to|via|divide|fill|stroke|outline|decoration|caret|accent|shadow)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|zinc|neutral|stone)-\d+/g;

// 任意値の色指定。ブランド色以外で使わない
const ARBITRARY_HEX_CLASS = /(?:bg|text|border|ring)-\[#[0-9a-fA-F]{3,8}\]/g;

// 慣習色・カテゴリ色の管理点。globals.css の例外一覧と対応する
const SANCTIONED = new Set([
  'src/shared/utils/bracket.ts',
  'src/shared/utils/gender.ts',
  'src/shared/constants/rank-medal.ts',
  'src/entities/user/constants.ts',
  'src/entities/horse/ui/horse-type-badge.tsx',
  'src/features/betting/ui/payout-result-modal.tsx',
  'src/features/forecasts/components/ForecastDisplay.tsx',
  'src/shared/ui/live-connection-status.tsx',
]);

// 意味色の手組みが残る既存ファイル。新規追加は禁止で、直書きを解消したらここから削除する
const GRANDFATHERED = new Set([
  'src/app/(app)/events/[id]/bet5/page.tsx',
  'src/app/admin/bets/[raceId]/page.tsx',
  'src/app/admin/races/[id]/page.tsx',
  'src/app/races/[id]/standby/standby-client.tsx',
  'src/entities/horse/ui/horse-source-badge.tsx',
  'src/entities/race/ui/race-page-header.tsx',
  'src/entities/wallet/ui/transaction-list.tsx',
  'src/features/admin/bet5/ui/bet5-event-list.tsx',
  'src/features/admin/bet5/ui/bet5-manage-card.tsx',
  'src/features/admin/bet5/ui/bet5-ticket-list.tsx',
  'src/features/admin/guest-codes/ui/guest-code-manager.tsx',
  'src/features/admin/import-race/ui/import-race-client.tsx',
  'src/features/admin/manage-bets/ui/event-accordion.tsx',
  'src/features/admin/manage-entries/ui/entry-dnd.tsx',
  'src/features/admin/manage-entries/ui/entry-race-accordion.tsx',
  'src/features/admin/manage-events/ui/admin-event-editor.tsx',
  'src/features/admin/manage-events/ui/admin-ranking-manager.tsx',
  'src/features/admin/manage-horse-tags/ui/horse-tag-list.tsx',
  'src/features/admin/manage-horses/ui/horse-form.tsx',
  'src/features/admin/manage-race-definitions/ui/race-definition-list.tsx',
  'src/features/admin/manage-races/ui/kitchen-timer.tsx',
  'src/features/admin/manage-races/ui/race-accordion.tsx',
  'src/features/admin/manage-races/ui/race-result-form.tsx',
  'src/features/admin/manage-users/ui/user-list.tsx',
  'src/features/admin/manage-venues/ui/venue-list.tsx',
  'src/features/admin/shared/ui/confirm-delete-button.tsx',
  'src/features/auth/ui/emoji-keypad.tsx',
  'src/features/betting/ui/bet-table.tsx',
  'src/features/betting/ui/bet5-voting-form.tsx',
  'src/features/betting/ui/numeric-keypad.tsx',
  'src/features/betting/ui/purchased-ticket-list.tsx',
  'src/features/economy/claim/ui/event-claim-list.tsx',
  'src/features/economy/loan/ui/loan-banner.tsx',
  'src/features/ranking/components/ranking-list.tsx',
  'src/features/stats/components/asset-chart.tsx',
  'src/features/stats/components/current-balance-display.tsx',
  'src/features/stats/components/event-stats-card.tsx',
  'src/features/stats/components/net-worth-display.tsx',
  'src/features/user/ui/editable-user-profile.tsx',
  'src/features/user/ui/name-change-form.tsx',
  'src/shared/ui/button.tsx',
  'src/shared/ui/dropdown-menu.tsx',
]);

// 任意値 hex を認めるファイル。Discord のブランド色のみ
const HEX_ALLOWED = new Set(['src/features/auth/ui/login-button.tsx']);

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, acc);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(name) || /\.test\.(ts|tsx)$/.test(name) || name.endsWith('.d.ts')) continue;
    acc.push(full);
  }
  return acc;
}

describe('生パレット色の使用箇所', () => {
  const root = process.cwd();
  const files = collectSourceFiles(join(root, 'src'));

  const withRawColors = new Set<string>();
  const withHex = new Set<string>();
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const rel = relative(root, file);
    if (RAW_PALETTE_CLASS.test(source)) withRawColors.add(rel);
    RAW_PALETTE_CLASS.lastIndex = 0;
    if (ARBITRARY_HEX_CLASS.test(source)) withHex.add(rel);
    ARBITRARY_HEX_CLASS.lastIndex = 0;
  }

  it('許可されていないファイルに生パレット色クラスがない', () => {
    const violations = [...withRawColors].filter((f) => !SANCTIONED.has(f) && !GRANDFATHERED.has(f)).sort();
    expect(
      violations,
      '色は globals.css のトークンか Badge 等の部品を使う。慣習色として維持するなら globals.css の例外一覧と本テストの SANCTIONED へ登録する'
    ).toEqual([]);
  });

  it('残置一覧のファイルにはまだ直書きが残っている', () => {
    const stale = [...GRANDFATHERED].filter((f) => !withRawColors.has(f)).sort();
    expect(stale, '直書きを解消したファイルは GRANDFATHERED から削除して後戻りを防ぐ').toEqual([]);
  });

  it('任意値の hex 色はブランド色以外にない', () => {
    const violations = [...withHex].filter((f) => !HEX_ALLOWED.has(f)).sort();
    expect(violations).toEqual([]);
  });
});
