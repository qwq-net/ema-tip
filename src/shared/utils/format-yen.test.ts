import { describe, expect, it } from 'vitest';
import { formatYen } from './format-yen';

describe('formatYen', () => {
  it('3 桁区切りに 円 を付けること', () => {
    expect(formatYen(1234567)).toBe('1,234,567円');
    expect(formatYen(500)).toBe('500円');
  });

  it('0 は 0円 になること', () => {
    expect(formatYen(0)).toBe('0円');
  });
});
