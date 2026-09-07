import { cn } from '@/shared/utils/cn';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * 一覧やカードが 0 件のときに置く枠付きの空状態。見出しで場所を示し、説明で埋まる条件を伝え、
 * action に次の操作を 1 つだけ渡す。同じ画面に操作フォームがあるときは action を渡さない。
 * テーブル行の中に置くときは TableEmptyRow を使う。
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-surface flex flex-col items-center gap-1 border border-gray-200 bg-white px-6 py-12 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-2 rounded-full bg-gray-100 p-3">
          <Icon className="text-text-sub h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <p className="text-text-main font-semibold">{title}</p>
      {description && <p className="text-text-sub text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
