import { describe, expect, it } from 'vitest';
import { formatRemainingTime } from './use-race-timer';

describe('formatRemainingTime', () => {
  it('残り時間を 分:秒 で整形する', () => {
    expect(formatRemainingTime(90 * 1000)).toBe('1:30');
  });

  it('秒がゼロ埋めされる', () => {
    expect(formatRemainingTime(65 * 1000)).toBe('1:05');
  });

  it('1時間以上は 時:分:秒 で整形し、分もゼロ埋めされる', () => {
    expect(formatRemainingTime(3661 * 1000)).toBe('1:01:01');
  });

  it('0以下は 0:00 を返す', () => {
    expect(formatRemainingTime(0)).toBe('0:00');
    expect(formatRemainingTime(-500)).toBe('0:00');
  });

  it('端数ミリ秒は切り捨てる', () => {
    expect(formatRemainingTime(59999)).toBe('0:59');
  });
});
