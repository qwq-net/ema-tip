import { RaceDefinitionList } from '@/features/admin/manage-race-definitions/ui/race-definition-list';
import { AdminLoadingCard, AdminPageHeader, AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { Button } from '@/shared/ui';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'レースマスタ管理',
};

export default function RaceDefinitionsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="レースマスタ管理" description="毎年開催されるレースの基本情報を管理します。" />

      <div className="space-y-4">
        <AdminSectionTitle
          actions={
            <Button asChild className="gap-2">
              <Link href="/admin/race-definitions/new">
                <Plus className="h-4 w-4" />
                レースマスタを追加
              </Link>
            </Button>
          }
        >
          登録済みのレースマスタ
        </AdminSectionTitle>

        <Suspense fallback={<AdminLoadingCard />}>
          <RaceDefinitionList />
        </Suspense>
      </div>
    </div>
  );
}
