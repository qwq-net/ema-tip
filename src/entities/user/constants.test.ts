import { describe, expect, it } from 'vitest';
import { isValidLoginId, isValidUserName } from './constants';

describe('isValidLoginId', () => {
  it('半角英数字だけのIDを通す', () => {
    expect(isValidLoginId('taro01')).toBe(true);
    expect(isValidLoginId('Taro')).toBe(true);
  });

  it('3文字未満と20文字超を弾く', () => {
    expect(isValidLoginId('ab')).toBe(false);
    expect(isValidLoginId('abc')).toBe(true);
    expect(isValidLoginId('a'.repeat(20))).toBe(true);
    expect(isValidLoginId('a'.repeat(21))).toBe(false);
  });

  it('英数字以外を含むIDを弾く', () => {
    expect(isValidLoginId('たろう')).toBe(false);
    expect(isValidLoginId('taro_01')).toBe(false);
    expect(isValidLoginId('taro 01')).toBe(false);
    expect(isValidLoginId('')).toBe(false);
  });
});

describe('isValidUserName', () => {
  it('英数字とかなカナ漢字を通し、記号と空白を弾く', () => {
    expect(isValidUserName('えま太郎')).toBe(true);
    expect(isValidUserName('ema 太郎')).toBe(false);
    expect(isValidUserName('')).toBe(false);
  });
});
