import { describe, expect, it, vi } from 'vitest';
import { formatJST, parseJSTToUTC, todayJST } from './date';

describe('utils/date', () => {
  describe('parseJSTToUTC', () => {
    it('JST文字列をUTCのDateオブジェクトに正しくパースすること', () => {
      const jstString = '2023-01-01T09:00';
      const result = parseJSTToUTC(jstString);
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2023-01-01T00:00:00.000Z');
    });

    it('無効な日付文字列に対してnullを返すこと', () => {
      expect(parseJSTToUTC('invalid')).toBeNull();
    });

    it('null/undefinedに対してnullを返すこと', () => {
      expect(parseJSTToUTC(null)).toBeNull();
    });
  });

  describe('formatJST', () => {
    it('デフォルトオプション(HH:mm)で日付をフォーマットすること', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      expect(formatJST(date)).toBe('09:00');
    });

    it('カスタムIntlオプションで日付をフォーマットすること', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      expect(formatJST(date, { hour: 'numeric', minute: 'numeric', second: 'numeric' })).toBe('9:00:00');
    });

    it('複雑なIntl.DateTimeFormatOptionsを扱えること', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };

      expect(formatJST(date, options)).toBe('2023年1月1日');
    });

    it('null/undefinedに対して空文字を返すこと', () => {
      expect(formatJST(null)).toBe('');
    });
  });

  describe('todayJST', () => {
    it('YYYY-MM-DD 形式で返すこと', () => {
      expect(todayJST()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('UTC 深夜でも JST の日付を返すこと', () => {
      vi.useFakeTimers();
      // UTC 2026-03-09 23:30 = JST 2026-03-10 08:30
      vi.setSystemTime(new Date('2026-03-09T23:30:00Z'));
      expect(todayJST()).toBe('2026-03-10');
      vi.useRealTimers();
    });
  });
});
