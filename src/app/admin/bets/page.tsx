import { getEventsWithRaces } from '@/features/admin/manage-bets/actions/read';
import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { EventAccordion } from '@/features/admin/manage-bets/ui/event-accordion';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '馬券管理',
};

export default async function BetsPage() {
  const events = await getEventsWithRaces();

  return (
    <div className="space-y-6">
      <AdminPageHeader title="馬券管理" description="イベント・レース別の馬券購入状況を確認します" />

      <EventAccordion events={events} />
    </div>
  );
}
