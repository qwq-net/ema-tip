'use client';

import { cn } from '@/shared/utils/cn';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface AdminTabItem {
  href: string;
  label: string;
  /**
   * ラベルの左に添えるアイコン。`<Trophy />` のように素の要素で渡し、大きさは部品側で 16px に揃える。
   * 描画済みの要素で受けるのでサーバーコンポーネントから渡せる。
   */
  icon?: ReactNode;
}

/**
 * 詳細画面の見出し直下に置くルート対応タブ。イベントとレースの両階層で同じ見た目を使う。
 * 現在地は pathname と href の完全一致で判定し、一致したリンクに aria-current="page" を付ける。
 * サブページ内でさらに深い URL に入った場合はどのタブも選択状態にならない。
 */
export function AdminTabs({ items }: { items: AdminTabItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="詳細の区分" className="border-b border-gray-200">
      <ul className="-mb-px flex gap-6 overflow-x-auto">
        {items.map((item) => {
          const isCurrent = pathname === item.href;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'inline-flex h-11 items-center gap-1.5 border-b-2 px-1 text-sm font-semibold transition-colors',
                  isCurrent
                    ? 'border-primary text-text-main'
                    : 'text-text-sub hover:text-text-main border-transparent hover:border-gray-300'
                )}
              >
                {item.icon ? <span className="[&>svg]:h-4 [&>svg]:w-4">{item.icon}</span> : null}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
