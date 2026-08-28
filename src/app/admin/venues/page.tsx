import { VenueList } from '@/features/admin/manage-venues/ui/venue-list';
import { AdminLoadingCard, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Button } from '@/shared/ui';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: '競馬場管理',
};

export default async function AdminVenuesPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="開催会場管理" description="開催会場の登録・管理を行います" />

      <div className="space-y-4">
        <div className="flex items-end justify-between px-2">
          <h2 className="text-xl font-semibold text-gray-900">登録済みの会場</h2>
          <Button
            asChild
            className="flex items-center gap-2 font-semibold shadow-sm transition-all hover:shadow-md active:scale-95"
          >
            <Link href="/admin/venues/new">
              <Plus className="h-4 w-4" />
              新規登録
            </Link>
          </Button>
        </div>

        <Suspense fallback={<AdminLoadingCard />}>
          <VenueList />
        </Suspense>
      </div>
    </div>
  );
}
