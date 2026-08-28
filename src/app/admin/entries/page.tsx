import { getRacesForSelect } from '@/features/admin/manage-entries';
import { EntryRaceAccordion } from '@/features/admin/manage-entries/ui/entry-race-accordion';
import { AdminLoadingCard, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: '出走馬管理',
};

async function RaceSelectList() {
  const events = await getRacesForSelect();

  return <EntryRaceAccordion events={events} />;
}

export default function EntriesPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="出走馬管理" description="レースを選択して出走馬を登録します" />

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">登録可能なレース</h2>
          </div>
        </div>

        <Suspense fallback={<AdminLoadingCard />}>
          <RaceSelectList />
        </Suspense>
      </div>
    </div>
  );
}
