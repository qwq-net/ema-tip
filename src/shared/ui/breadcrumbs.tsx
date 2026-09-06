import { cn } from '@/shared/utils/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  /** 省略するとリンクにならない。表側のイベント名のようにページを持たない階層に使う。 */
  href?: string;
}

/**
 * 現在地までの階層を示すパンくず。最後の項目が現在地で、リンクを持たず aria-current を付ける。
 * 狭い画面では末尾 2 項目だけを残し、親の前に ‹ を出して戻る導線として読めるようにする。
 * 現在地だけは長い名称を省略記号で切り、途中の項目は常に全文を出す。
 */
export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  const lastIndex = items.length - 1;
  return (
    <nav aria-label="現在地" className={cn('text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isCurrent = index === lastIndex;
          const isParent = index === lastIndex - 1;
          return (
            <li
              key={`${index}-${item.label}`}
              className={cn('flex min-w-0 items-center gap-1', !isCurrent && !isParent && 'hidden sm:flex')}
            >
              {index > 0 && (
                <ChevronRight
                  aria-hidden="true"
                  className={cn('h-4 w-4 shrink-0 text-gray-300', isParent && 'hidden sm:block')}
                />
              )}
              {isParent && <ChevronLeft aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400 sm:hidden" />}
              {isCurrent && (
                <span aria-current="page" className="truncate font-medium text-gray-900">
                  {item.label}
                </span>
              )}
              {!isCurrent && item.href && (
                <Link href={item.href} className="whitespace-nowrap text-gray-500 hover:text-gray-900 hover:underline">
                  {item.label}
                </Link>
              )}
              {!isCurrent && !item.href && <span className="whitespace-nowrap text-gray-500">{item.label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
