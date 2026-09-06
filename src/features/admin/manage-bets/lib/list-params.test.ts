import { describe, expect, it } from 'vitest';
import { buildBetGroupListQuery, parseBetGroupListParams } from './list-params';

describe('parseBetGroupListParams', () => {
  it('未指定なら既定の条件になること', () => {
    expect(parseBetGroupListParams({})).toEqual({ sort: 'createdAt', dir: 'desc', page: 1 });
  });

  it('空文字は未指定として扱い、複数値は先頭を採用すること', () => {
    const params = parseBetGroupListParams({ q: '', type: ['win', 'place'], status: 'HIT', page: '3' });
    expect(params).toEqual({ type: 'win', status: 'HIT', sort: 'createdAt', dir: 'desc', page: 3 });
  });

  it('不正な値は項目ごとに既定へ倒すこと', () => {
    const params = parseBetGroupListParams({ type: 'bogus', status: 'X', sort: 'name', dir: 'up', page: '0' });
    expect(params).toEqual({ sort: 'createdAt', dir: 'desc', page: 1 });
  });

  it('検索語の前後の空白を除き、50 文字を超えると捨てること', () => {
    expect(parseBetGroupListParams({ q: '  太郎 ' }).q).toBe('太郎');
    expect(parseBetGroupListParams({ q: 'a'.repeat(51) }).q).toBeUndefined();
  });
});

describe('buildBetGroupListQuery', () => {
  const current = parseBetGroupListParams({ q: '太郎', status: 'HIT', sort: 'amount', dir: 'asc', page: '4' });

  it('条件を変えるとページを 1 に戻し、既定値は書かないこと', () => {
    expect(buildBetGroupListQuery(current, { sort: 'createdAt', dir: 'desc' })).toBe(
      '?q=%E5%A4%AA%E9%83%8E&status=HIT'
    );
  });

  it('ページだけ変えるときは他の条件を保つこと', () => {
    expect(buildBetGroupListQuery(current, { page: 5 })).toBe(
      '?q=%E5%A4%AA%E9%83%8E&status=HIT&sort=amount&dir=asc&page=5'
    );
  });

  it('undefined を渡した条件は落とし、全て既定なら空文字を返すこと', () => {
    expect(buildBetGroupListQuery(current, { q: undefined, status: undefined, sort: 'createdAt', dir: 'desc' })).toBe(
      ''
    );
  });
});
