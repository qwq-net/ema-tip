import { describe, expect, it } from 'vitest';
import { splitGraphemes } from './graphemes';

describe('splitGraphemes', () => {
  it('ASCII 文字列は 1 文字ずつ分割する', () => {
    expect(splitGraphemes('abc')).toEqual(['a', 'b', 'c']);
  });

  it('単一コードポイントの絵文字の並びは絵文字ごとに分割する', () => {
    expect(splitGraphemes('🐶🐶🐶')).toEqual(['🐶', '🐶', '🐶']);
  });

  it('ZWJ で結合した絵文字は 1 要素にまとまる', () => {
    expect(splitGraphemes('👨‍👩‍👧')).toHaveLength(1);
  });
});
