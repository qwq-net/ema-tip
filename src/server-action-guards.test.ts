import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Server Action の認可ガード漏れを検出する横断テスト。
 * 'use server' ファイルのエクスポート関数は認証なしで POST できる公開エンドポイントのため、
 * 全関数が requireAdmin / requireUser / requireLoginPage / auth() のいずれかへ
 * 到達することを静的に検査する。意図的に未ガードで公開する関数は理由付きで下の許可リストへ追加する。
 */

// 意図的に未ガードで公開している関数。「ファイル名:関数名」で指定する
const PUBLIC_ALLOWLIST = new Map<string, string>([
  ['auth-actions.ts:discordSignIn', 'ログイン導線そのもの'],
  ['auth-actions.ts:checkIpLockStatus', '返すのは呼び出し元IP自身のロック状態のみ'],
  ['auth-actions.ts:validateGuestRegistration', '登録前検証。失敗をIPレート制限へ記録して総当たりを防ぐ'],
  ['auth-actions.ts:logout', 'サインアウト導線'],
]);

const GUARD_PATTERN = /requireAdmin\(|requireUser\(|requireLoginPage\(|await auth\(/;

function collectTsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectTsFiles(fullPath);
    if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) return [fullPath];
    return [];
  });
}

// エクスポート関数ごとに、次の export 宣言までをその関数の担当領域として切り出す。
// runAction(() => inner()) のように非公開の inner 関数へ委譲するパターンでは、
// inner の本体が同じ領域に含まれるため、そこにあるガードも検出できる
function splitExportedFunctions(content: string): Array<{ name: string; body: string }> {
  const matches = [...content.matchAll(/^export async function (\w+)/gm)];
  return matches.map((m) => {
    const start = m.index!;
    const nextExport = content.indexOf('\nexport ', start + 1);
    const end = nextExport === -1 ? content.length : nextExport;
    return { name: m[1], body: content.slice(start, end) };
  });
}

describe('Server Action の認可ガード', () => {
  const srcDir = path.resolve(__dirname);
  const actionFiles = collectTsFiles(srcDir).filter((file) => {
    const head = readFileSync(file, 'utf-8').slice(0, 100);
    return head.startsWith("'use server'") || head.startsWith('"use server"');
  });

  it("収集ロジックの自壊検知として 'use server' ファイルの存在を確認する", () => {
    expect(actionFiles.length).toBeGreaterThan(10);
  });

  it('全エクスポート関数がガードを持つか、許可リストに理由付きで登録されている', () => {
    const violations: string[] = [];

    for (const file of actionFiles) {
      const content = readFileSync(file, 'utf-8');
      const fileName = path.basename(file);

      for (const fn of splitExportedFunctions(content)) {
        const key = `${fileName}:${fn.name}`;
        if (GUARD_PATTERN.test(fn.body)) continue;
        if (PUBLIC_ALLOWLIST.has(key)) continue;
        violations.push(`${path.relative(srcDir, file)} の ${fn.name}`);
      }
    }

    expect(
      violations,
      `認可ガードのない Server Action があります。requireUser / requireAdmin 等を追加するか、` +
        `意図的な公開なら PUBLIC_ALLOWLIST へ理由付きで登録してください:\n${violations.join('\n')}`
    ).toEqual([]);
  });

  it('許可リストに現存しない関数が残っていない', () => {
    const existing = new Set(
      actionFiles.flatMap((file) => {
        const content = readFileSync(file, 'utf-8');
        return splitExportedFunctions(content).map((fn) => `${path.basename(file)}:${fn.name}`);
      })
    );

    const stale = [...PUBLIC_ALLOWLIST.keys()].filter((key) => !existing.has(key));
    expect(stale, `許可リストに削除済みの関数が残っています: ${stale.join(', ')}`).toEqual([]);
  });
});
