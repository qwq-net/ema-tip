import { HorseList } from '@/features/admin/manage-horses';
import { getHorses } from '@/features/admin/manage-horses/actions';
import { AdminLoadingCard, AdminPageHeader, AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { Button } from '@/shared/ui';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: '馬マスタ管理',
};

// 一覧の絞り込みはクライアント側で行うため、データ取得だけをサーバー側で担う
async function HorseListSection() {
  const horses = await getHorses();
  return <HorseList horses={horses} />;
}

export default function HorsesPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="馬マスタ管理" description="競走馬の新規登録と情報の管理を行います" />

      <div className="space-y-4">
        <AdminSectionTitle
          actions={
            <Button asChild className="gap-2">
              <Link href="/admin/horses/new">
                <Plus className="h-4 w-4" />
                新規馬登録
              </Link>
            </Button>
          }
        >
          登録済みの馬
        </AdminSectionTitle>

        <Suspense fallback={<AdminLoadingCard />}>
          <HorseListSection />
        </Suspense>
      </div>
    </div>
  );
}
