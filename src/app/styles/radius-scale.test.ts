import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 形状スケールの台帳。src 配下の tsx を走査し、@theme で定義した
 * rounded-control / rounded-surface / rounded-chip / rounded-full 以外の角丸と、
 * 静的サーフェスをフラットに保つ方針に反する shadow-xs / shadow-sm を検出する。
 */

const SRC_ROOT = join(import.meta.dirname, '../..');

function listTsxFiles(): string[] {
  return readdirSync(SRC_ROOT, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => join(SRC_ROOT, f));
}

// 既定スケールの角丸と方向付き角丸。rounded-full と自前トークン3種は後読みの除外で許可する
const FORBIDDEN_RADIUS = /\brounded(?:-(?:xs|sm|md|lg|xl|2xl|3xl|4xl)|-[trbse][lre]?(?:-[\w[\]]+)?)?(?![\w-])/g;
const FORBIDDEN_SHADOW = /\bshadow-(?:xs|sm)\b/g;

describe('形状スケールの統一', () => {
  const files = listTsxFiles();

  it('走査対象の tsx が存在する', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(files.map((f) => [f.replace(SRC_ROOT, 'src'), f]))(
    '%s はスケール外の角丸と静的影を含まない',
    (_label, file) => {
      const content = readFileSync(file, 'utf8');
      const violations: string[] = [
        ...(content.match(FORBIDDEN_RADIUS) ?? []),
        ...(content.match(FORBIDDEN_SHADOW) ?? []),
      ];
      expect(violations).toEqual([]);
    }
  );
});
