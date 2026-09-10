import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * 利用者側ページ最上部の h1 ブロック。title は h1 text-3xl、description は text-sub で描く。
 * icon を渡すと左に 48px のブランド色タイルを置く。actions は見出しの右端に並び、狭い幅では下に折り返す。
 * 管理ページは AdminPageHeader を使う。
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  const heading = (
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="bg-turf-100 text-turf-800 rounded-surface flex h-12 w-12 shrink-0 items-center justify-center">
          <Icon size={28} aria-hidden="true" />
        </div>
      )}
      <div>
        <h1 className="text-text-main text-3xl font-semibold">{title}</h1>
        {description ? <div className="text-text-sub mt-1">{description}</div> : null}
      </div>
    </div>
  );
  if (!actions) return heading;
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {heading}
      <div className="flex shrink-0 items-center gap-2">{actions}</div>
    </div>
  );
}
