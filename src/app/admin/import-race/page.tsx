import { ImportRaceClient } from '@/features/admin/import-race/ui/import-race-client';
import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { getEvents } from '@/features/admin/manage-races/actions/read';
import { getVenues } from '@/features/admin/manage-venues/actions';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '出馬表インポート',
};

export default async function ImportRacePage() {
  const [events, venues] = await Promise.all([getEvents(), getVenues()]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="出馬表インポート"
        description="Netkeiba出馬表URLからレース・出走馬情報を一括インポートします"
      />
      <ImportRaceClient events={events} venues={venues} />
    </div>
  );
}
