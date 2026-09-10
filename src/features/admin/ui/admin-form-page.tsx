import { AdminPage } from '@/features/admin/ui/admin-page';
import { Card, CardContent } from '@/shared/ui';
import { Breadcrumbs, type BreadcrumbItem } from '@/shared/ui/breadcrumbs';
import { AdminPageHeader } from '@/shared/ui/layout/admin-page-header';
import type { ReactNode } from 'react';

/**
 * 登録・編集ページの骨格。Breadcrumbs → AdminPageHeader → Card の順を固定し、children にフォームを置く。
 * 一覧や詳細のような骨格の違うページは AdminPage を使う。
 */
export function AdminFormPage({
  breadcrumbs,
  title,
  description,
  width = 'narrow',
  children,
}: {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description?: ReactNode;
  width?: 'narrow' | 'medium';
  children: ReactNode;
}) {
  return (
    <AdminPage width={width}>
      <Breadcrumbs items={breadcrumbs} />
      <AdminPageHeader title={title} description={description} />
      <Card>
        <CardContent>{children}</CardContent>
      </Card>
    </AdminPage>
  );
}
