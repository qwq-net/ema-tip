import { Card } from '@/shared/ui';
import type { ReactNode } from 'react';

/**
 * 管理画面ページ最上部の見出しブロック。description には文字列のほか補足要素も渡せる。
 * actions を渡すと見出しの右に並べ、md 未満では見出しの下に落とす。イベント詳細のステータスパネルが使う。
 */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  const heading = (
    <div>
      <h1 className="text-text-main text-2xl font-semibold">{title}</h1>
      {description ? <div className="text-text-sub mt-1 text-sm">{description}</div> : null}
    </div>
  );
  if (!actions) return heading;
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      {heading}
      {actions}
    </div>
  );
}

/** Suspense フォールバック用の読み込み中カード。 */
export function AdminLoadingCard() {
  return <Card className="text-text-sub py-12 text-center">読み込み中...</Card>;
}
