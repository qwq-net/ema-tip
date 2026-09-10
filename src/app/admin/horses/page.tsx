import { HorseList } from '@/features/admin/manage-horses';
import { getHorses } from '@/features/admin/manage-horses/actions';
import { AdminPage } from '@/features/admin/ui/admin-page';
import { Button, SectionTitle } from '@/shared/ui';
import { AdminLoadingCard, AdminPageHeader } from '@/shared/ui/layout/admin-page-header';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: '馬マスタ管理',
};

/** 一覧の絞り込みはクライアント側で行うため、データ取得だけをサーバー側で担う。 */
async function HorseListSection() {
  const horses = await getHorses();
  return <HorseList horses={horses} />;
}

export default function HorsesPage() {
  return (
    <AdminPage>
      <AdminPageHeader title="馬マスタ管理" description="競走馬の新規登録と情報の管理を行います" />
      <SectionTitle
        actions={
          <Button asChild>
            <Link href="/admin/horses/new">
              <Plus />
              馬を追加
            </Link>
          </Button>
        }
      >
        登録済みの馬
      </SectionTitle>
      <Suspense fallback={<AdminLoadingCard />}>
        <HorseListSection />
      </Suspense>
    </AdminPage>
  );
}
