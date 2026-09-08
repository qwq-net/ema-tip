import { VenueList } from '@/features/admin/manage-venues/ui/venue-list';
import { AdminLoadingCard, AdminPageHeader, AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { Button } from '@/shared/ui';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: '競馬場管理',
};

export default function AdminVenuesPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="競馬場管理" description="競馬場の登録・管理を行います" />

      <div className="space-y-4">
        <AdminSectionTitle
          actions={
            <Button asChild className="gap-2">
              <Link href="/admin/venues/new">
                <Plus className="h-4 w-4" />
                競馬場を追加
              </Link>
            </Button>
          }
        >
          登録済みの競馬場
        </AdminSectionTitle>

        <Suspense fallback={<AdminLoadingCard />}>
          <VenueList />
        </Suspense>
      </div>
    </div>
  );
}
