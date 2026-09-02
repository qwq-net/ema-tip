import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 文字サイズと太さの台帳。src 配下の tsx を走査し、小さすぎて読めない日本語テキストの
 * 混入を検出する。規則は globals.css の @theme コメントと対応する。
 * - 任意値のフォントサイズ text-[Npx] 等は禁止。サイズはスケールから選ぶ
 * - text-xs は 12px の小型チップ限定で、同じ className に font-semibold か font-bold が必須
 * - 400 未満のウェイトは日本語システム書体で潰れるため全面禁止
 */

const SRC_ROOT = join(import.meta.dirname, '../..');

function listTsxFiles(): string[] {
  return readdirSync(SRC_ROOT, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => join(SRC_ROOT, f));
}

const ARBITRARY_FONT_SIZE = /\btext-\[[\d.]+(?:px|rem|em)\]/g;
const LIGHT_WEIGHT = /\bfont-(?:thin|extralight|light)\b/g;

describe('文字スケールの統一', () => {
  const files = listTsxFiles();

  it.each(files.map((f) => [f.replace(SRC_ROOT, 'src'), f]))(
    '%s はスケール外サイズ・軽量ウェイト・太さ指定なしの text-xs を含まない',
    (_label, file) => {
      const content = readFileSync(file, 'utf8');
      const violations: string[] = [
        ...(content.match(ARBITRARY_FONT_SIZE) ?? []),
        ...(content.match(LIGHT_WEIGHT) ?? []),
      ];
      for (const line of content.split('\n')) {
        if (line.includes('text-xs') && !/font-(?:semibold|bold)/.test(line)) {
          violations.push(`太さ指定なしの text-xs: ${line.trim().slice(0, 80)}`);
        }
      }
      expect(violations).toEqual([]);
    }
  );
});
