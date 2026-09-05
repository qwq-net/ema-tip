'use client';

import { cn } from '@/shared/utils/cn';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * 詳細画面の見出し直下に置くルート対応タブ。イベントとレースの両階層で同じ見た目を使う。
 * 現在地は pathname と href の完全一致で判定し、一致したリンクに aria-current="page" を付ける。
 * サブページ内でさらに深い URL に入った場合はどのタブも選択状態にならない。
 */
export function AdminTabs({ items }: { items: { href: string; label: string }[] }) {
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
                  'inline-flex h-11 items-center border-b-2 px-1 text-sm font-medium transition-colors',
                  isCurrent
                    ? 'border-primary text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900'
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
