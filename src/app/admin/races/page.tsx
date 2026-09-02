import { getAdminRaceGroups } from '@/features/admin/manage-races/queries';
import { RaceAccordion } from '@/features/admin/manage-races/ui/race-accordion';
import { AdminLoadingCard, AdminPageHeader, AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { Button } from '@/shared/ui';
import { CircleHelp, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'レース管理',
};

export default async function RacesPage() {
  const sortedEventGroups = await getAdminRaceGroups();

  return (
    <div className="space-y-6">
      <AdminPageHeader title="レース管理" description="レースの登録・管理を行います" />

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <AdminSectionTitle>登録済みのレース</AdminSectionTitle>
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
              <CircleHelp className="h-4 w-4 text-gray-500" />
              <span>レースの締め切りや払い戻し確定操作は レースタイトルのリンク先から行えます。</span>
            </div>
          </div>
          <Button asChild className="flex items-center gap-2 font-semibold transition active:scale-[.96]">
            <Link href="/admin/races/new">
              <Plus className="h-4 w-4" />
              新規レース追加
            </Link>
          </Button>
        </div>

        <Suspense fallback={<AdminLoadingCard />}>
          <RaceAccordion events={sortedEventGroups} />
        </Suspense>
      </div>
    </div>
  );
}
