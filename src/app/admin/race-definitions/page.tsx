import { RaceDefinitionList } from '@/features/admin/manage-race-definitions/ui/race-definition-list';
import { AdminPage } from '@/features/admin/ui/admin-page';
import { Button, SectionTitle } from '@/shared/ui';
import { AdminLoadingCard, AdminPageHeader } from '@/shared/ui/layout/admin-page-header';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'レースマスタ管理',
};

export default function RaceDefinitionsPage() {
  return (
    <AdminPage>
      <AdminPageHeader title="レースマスタ管理" description="毎年開催されるレースの基本情報を管理します。" />
      <SectionTitle
        actions={
          <Button asChild>
            <Link href="/admin/race-definitions/new">
              <Plus />
              レースマスタを追加
            </Link>
          </Button>
        }
      >
        登録済みのレースマスタ
      </SectionTitle>
      <Suspense fallback={<AdminLoadingCard />}>
        <RaceDefinitionList />
      </Suspense>
    </AdminPage>
  );
}
