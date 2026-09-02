import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * globals.css の @theme からトークンを読み、主要な前景背景ペアの WCAG コントラスト比を検証する台帳。
 * 色を調整したら値の張り替えだけでこのテストが AA 割れを検出する。
 * トークンは hex 直値か var() による他トークン参照のみを前提とする。
 */

/** @theme ブロック内の --color-* 定義を { 名前: 値 } で返す。値は未解決のまま。 */
function readThemeTokens() {
  const css = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8');
  const theme = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1];
  if (!theme) throw new Error('@theme ブロックが見つかりません');
  const tokens: Record<string, string> = {};
  for (const [, name, value] of theme.matchAll(/(--color-[\w-]+):\s*([^;]+);/g)) {
    tokens[name] = value.trim();
  }
  return tokens;
}

/** トークン値の var() 連鎖を辿って hex に解決する。解決できなければ throw する。 */
function resolveHex(tokens: Record<string, string>, name: string): string {
  let value = tokens[name];
  for (let i = 0; value && i < 10; i++) {
    const ref = value.match(/^var\((--color-[\w-]+)\)$/)?.[1];
    if (!ref) break;
    value = tokens[ref];
  }
  if (!value?.match(/^#[0-9a-f]{6}$/i)) throw new Error(`${name} を hex に解決できません: ${value}`);
  return value;
}

function luminance(hex: string): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 0xff) + 0.0722 * channel(n & 0xff);
}

function contrast(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = '#ffffff';

describe('カラートークンのコントラスト', () => {
  const tokens = readThemeTokens();
  const hex = (name: string) => resolveHex(tokens, name);

  // [説明, 前景, 背景, 必要比] の台帳。文字は 4.5、アイコン等の非文字は 3.0
  const ledger: [string, string, string, number][] = [
    ['primary 面の白文字', WHITE, hex('--color-primary'), 4.5],
    ['primary-hover 面の白文字', WHITE, hex('--color-primary-hover'), 4.5],
    ['turf-600 面の白文字。塗りチップ用', WHITE, hex('--color-turf-600'), 4.5],
    ['白地の primary 文字。リンク等', hex('--color-primary'), hex('--color-surface'), 4.5],
    ['turf-50 チップ上の turf-700 文字', hex('--color-turf-700'), hex('--color-turf-50'), 4.5],
    ['turf-100 チップ上の turf-800 文字', hex('--color-turf-800'), hex('--color-turf-100'), 4.5],
    ['白地の本文 text-main', hex('--color-text-main'), hex('--color-surface'), 4.5],
    ['background 上の本文 text-main', hex('--color-text-main'), hex('--color-background'), 4.5],
    ['白地の補助文字 text-sub', hex('--color-text-sub'), hex('--color-surface'), 4.5],
    ['gray-50 上の補助文字 text-sub', hex('--color-text-sub'), hex('--color-gray-50'), 4.5],
    ['白地の error 文字', hex('--color-error'), hex('--color-surface'), 4.5],
    ['白地の success 文字', hex('--color-success'), hex('--color-surface'), 4.5],
    ['BET5 面 turf-950 上の gold 文字', hex('--color-gold'), hex('--color-turf-950'), 4.5],
    ['BET5 面 turf-950 上の白文字', WHITE, hex('--color-turf-950'), 4.5],
    ['BET5 面 turf-950 上の turf-100 補足文字', hex('--color-turf-100'), hex('--color-turf-950'), 4.5],
    ['gold チップ上の turf-950 文字', hex('--color-turf-950'), hex('--color-gold'), 4.5],
    ['secondary 面 サイドバーの gray-300 文字', hex('--color-gray-300'), hex('--color-secondary'), 4.5],
    ['secondary 面 サイドバーロゴの turf-400', hex('--color-turf-400'), hex('--color-secondary'), 3.0],
  ];

  it.each(ledger)('%s は %s on %s で必要比 %d を満たす', (_name, fg, bg, required) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(required);
  });
});
