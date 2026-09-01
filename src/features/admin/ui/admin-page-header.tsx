import { Card } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import { ChevronLeft, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

/** 管理画面ページ最上部の見出しブロック。description には文字列のほか補足要素も渡せる。 */
export function AdminPageHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      {description ? <div className="mt-1 text-sm text-gray-500">{description}</div> : null}
    </div>
  );
}

/**
 * 管理画面のセクション見出し。ページ内の大区分は h2、その内側の小区分は as="h3" を使う。
 * 文字サイズは h2=text-xl / h3=text-lg で固定し、利用側でサイズ指定しないこと。
 * 見出し階層は AdminPageHeader の h1 の下に置かれる前提。
 */
export function AdminSectionTitle({
  as: Tag = 'h2',
  icon: Icon,
  children,
  className,
}: {
  as?: 'h2' | 'h3';
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tag
      className={cn(
        'flex items-center gap-2 font-semibold text-gray-900',
        Tag === 'h2' ? 'text-xl' : 'text-lg',
        className
      )}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0 text-gray-400" />}
      {children}
    </Tag>
  );
}

/** 一覧ページ等へ戻るリンク。children 省略時は「一覧へ戻る」を表示する。 */
export function AdminBackLink({ href, children = '一覧へ戻る' }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900">
      <ChevronLeft size={16} />
      {children}
    </Link>
  );
}

/** Suspense フォールバック用の読み込み中カード。 */
export function AdminLoadingCard() {
  return <Card className="py-12 text-center text-gray-500">読み込み中...</Card>;
}
