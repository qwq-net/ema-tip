import { VenueList } from '@/features/admin/manage-venues/ui/venue-list';
import { AdminPage } from '@/features/admin/ui/admin-page';
import { Button, SectionTitle } from '@/shared/ui';
import { AdminLoadingCard, AdminPageHeader } from '@/shared/ui/layout/admin-page-header';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: '競馬場管理',
};

export default function AdminVenuesPage() {
  return (
    <AdminPage>
      <AdminPageHeader title="競馬場管理" description="競馬場の登録・管理を行います" />
      <SectionTitle
        actions={
          <Button asChild>
            <Link href="/admin/venues/new">
              <Plus />
              競馬場を追加
            </Link>
          </Button>
        }
      >
        登録済みの競馬場
      </SectionTitle>
      <Suspense fallback={<AdminLoadingCard />}>
        <VenueList />
      </Suspense>
    </AdminPage>
  );
}
