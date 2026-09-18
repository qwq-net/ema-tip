// 管理画面のルート。全ページの共通の接頭辞になるため、前方一致の対象から外す必要がある
const ADMIN_ROOT = '/admin';

export interface NavRoots {
  href: string;
  // href 配下でなくてもこの項目を選択状態にするパス
  alsoActiveUnder?: string[];
}

function matches(pathname: string, root: string): boolean {
  if (root === ADMIN_ROOT) return pathname === ADMIN_ROOT;
  return pathname === root || pathname.startsWith(`${root}/`);
}

/**
 * サイドバーで選択状態にする項目の href を 1 つだけ決める。
 * 現在地に一致する項目が複数あるときは最も長く一致したものを選ぶため、
 * /admin/users/guests では入れ子の親である /admin/users は選ばれない。
 * ダッシュボードの /admin は現在地がちょうど /admin のときだけ一致する。
 * どの項目にも一致しなければ null を返し、呼び手は全項目を非選択で描く。
 */
export function resolveActiveNavHref(pathname: string, items: NavRoots[]): string | null {
  let activeHref: string | null = null;
  let longest = -1;

  for (const item of items) {
    for (const root of [item.href, ...(item.alsoActiveUnder ?? [])]) {
      if (matches(pathname, root) && root.length > longest) {
        activeHref = item.href;
        longest = root.length;
      }
    }
  }

  return activeHref;
}
