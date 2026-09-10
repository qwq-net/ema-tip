import { getRaces } from '@/features/admin/manage-races/actions/read';
import { AdminPage } from '@/features/admin/ui/admin-page';
import { ForecastRaceAccordion } from '@/features/forecasts/components/ForecastRaceAccordion';
import { SectionTitle } from '@/shared/ui';
import { AdminLoadingCard, AdminPageHeader } from '@/shared/ui/layout/admin-page-header';
import { Suspense } from 'react';

export default async function ForecastsPage() {
  const races = await getRaces();

  interface EventGroup {
    id: string;
    name: string;
    date: string;
    status: string;
    races: typeof races;
  }

  const eventGroups = races.reduce<Record<string, EventGroup>>((acc, race) => {
    const eventId = race.event.id;
    const group = (acc[eventId] ??= {
      id: race.event.id,
      name: race.event.name,
      date: race.event.date,
      status: race.event.status,
      races: [],
    });
    group.races.push(race);
    return acc;
  }, {});

  const sortedEventGroups = Object.values(eventGroups).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <AdminPage>
      <AdminPageHeader
        title="予想管理"
        description="レースを選択して予想を入力してください。レース名をクリックすると予想入力画面へ移動します。"
      />
      <SectionTitle>開催一覧</SectionTitle>
      <Suspense fallback={<AdminLoadingCard />}>
        <ForecastRaceAccordion events={sortedEventGroups} />
      </Suspense>
    </AdminPage>
  );
}
