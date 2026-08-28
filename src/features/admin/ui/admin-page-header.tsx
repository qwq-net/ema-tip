import { Card } from '@/shared/ui';
import { ChevronLeft } from 'lucide-react';
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
