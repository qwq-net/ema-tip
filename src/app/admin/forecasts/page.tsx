import { getRaces } from '@/features/admin/manage-races/actions/read';
import { AdminLoadingCard, AdminPageHeader, AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { ForecastRaceAccordion } from '@/features/forecasts/components/ForecastRaceAccordion';
import { CircleHelp } from 'lucide-react';
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
    <div className="space-y-6">
      <AdminPageHeader title="予想管理" description="レースを選択して予想を入力してください" />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <AdminSectionTitle>開催一覧</AdminSectionTitle>
          <p className="text-text-sub flex items-center gap-1.5 text-sm">
            <CircleHelp className="h-4 w-4" />
            レース名をクリックすると予想入力画面へ移動します。
          </p>
        </div>

        <Suspense fallback={<AdminLoadingCard />}>
          <ForecastRaceAccordion events={sortedEventGroups} />
        </Suspense>
      </div>
    </div>
  );
}
