import { ImportRaceClient } from '@/features/admin/import-race/ui/import-race-client';
import { getEvents } from '@/features/admin/manage-races/actions/read';
import { getVenues } from '@/features/admin/manage-venues/actions';
import { AdminPage } from '@/features/admin/ui/admin-page';
import { AdminPageHeader } from '@/shared/ui/layout/admin-page-header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '出馬表インポート',
};

export default async function ImportRacePage() {
  const [events, venues] = await Promise.all([getEvents(), getVenues()]);

  return (
    <AdminPage>
      <AdminPageHeader
        title="出馬表インポート"
        description="Netkeiba出馬表URLからレース・出走馬情報を一括インポートします"
      />
      <ImportRaceClient events={events} venues={venues} />
    </AdminPage>
  );
}
