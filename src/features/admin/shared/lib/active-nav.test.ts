import { describe, expect, it } from 'vitest';
import { resolveActiveNavHref } from './active-nav';

const items = [
  { href: '/admin' },
  { href: '/admin/events', alsoActiveUnder: ['/admin/races'] },
  { href: '/admin/users' },
  { href: '/admin/users/guests' },
  { href: '/admin/users/admins' },
];

describe('resolveActiveNavHref', () => {
  it('入れ子の項目は最も長く一致した 1 つだけを選ぶ', () => {
    expect(resolveActiveNavHref('/admin/users/guests', items)).toBe('/admin/users/guests');
    expect(resolveActiveNavHref('/admin/users/admins', items)).toBe('/admin/users/admins');
  });

  it('親のパスそのものでは親を選ぶ', () => {
    expect(resolveActiveNavHref('/admin/users', items)).toBe('/admin/users');
  });

  it('項目のない配下のパスでは直近の親を選ぶ', () => {
    expect(resolveActiveNavHref('/admin/events/abc/edit', items)).toBe('/admin/events');
  });

  it('alsoActiveUnder のパスでもその項目を選ぶ', () => {
    expect(resolveActiveNavHref('/admin/races/abc', items)).toBe('/admin/events');
  });

  it('ダッシュボードはちょうど /admin のときだけ選ぶ', () => {
    expect(resolveActiveNavHref('/admin', items)).toBe('/admin');
    expect(resolveActiveNavHref('/admin/guide', items)).toBeNull();
  });

  it('似た名前の別パスは一致しない', () => {
    expect(resolveActiveNavHref('/admin/users-archive', items)).toBeNull();
  });
});
