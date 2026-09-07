import { Card } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** 管理画面ページ最上部の見出しブロック。description には文字列のほか補足要素も渡せる。 */
export function AdminPageHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div>
      <h1 className="text-text-main text-2xl font-semibold">{title}</h1>
      {description ? <div className="text-text-sub mt-1 text-sm">{description}</div> : null}
    </div>
  );
}

/**
 * 管理画面のセクション見出し。ページ内の大区分は h2、その内側の小区分は as="h3" を使う。
 * 文字サイズは h2=text-xl / h3=text-lg で固定し、利用側でサイズ指定しないこと。
 * 見出し階層は AdminPageHeader の h1 の下に置かれる前提。
 * actions を渡すと見出しの右端に操作を並べ、収まらない幅では操作が次の行の右端へ折り返す。
 * その場合 className は見出しではなく行全体に付く。
 */
export function AdminSectionTitle({
  as: Tag = 'h2',
  icon: Icon,
  actions,
  children,
  className,
}: {
  as?: 'h2' | 'h3';
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const heading = (
    <Tag
      className={cn(
        'text-text-main flex items-center gap-2 font-semibold',
        Tag === 'h2' ? 'text-xl' : 'text-lg',
        !actions && className
      )}
    >
      {Icon && <Icon className="text-text-sub h-5 w-5 shrink-0" />}
      {children}
    </Tag>
  );
  if (!actions) return heading;
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
      {heading}
      <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
    </div>
  );
}

/** Suspense フォールバック用の読み込み中カード。 */
export function AdminLoadingCard() {
  return <Card className="text-text-sub py-12 text-center">読み込み中...</Card>;
}
