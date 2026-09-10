import { getRaceDefinitions } from '@/features/admin/manage-race-definitions/actions';
import { getEvents } from '@/features/admin/manage-races/actions';
import { RaceForm } from '@/features/admin/manage-races/ui/race-form';
import { getVenues } from '@/features/admin/manage-venues/actions';
import { AdminFormPage } from '@/features/admin/ui/admin-form-page';

export default async function CreateRacePage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const [{ eventId }, events, raceDefinitions, venues] = await Promise.all([
    searchParams,
    getEvents(),
    getRaceDefinitions(),
    getVenues(),
  ]);
  // イベント詳細から来た場合はそのイベントを初期選択し、保存後もそのイベントへ戻す
  const selectedEvent = events.find((e) => e.id === eventId);
  const eventHref = selectedEvent ? `/admin/events/${selectedEvent.id}` : '/admin/events';

  return (
    <AdminFormPage
      breadcrumbs={[
        { label: 'イベント管理', href: '/admin/events' },
        ...(selectedEvent ? [{ label: selectedEvent.name, href: eventHref }] : []),
        { label: '新規レース登録' },
      ]}
      title="新規レース登録"
      description="新しいレースの基本情報を入力してください。"
    >
      <RaceForm
        events={events}
        defaultEventId={eventId}
        raceDefinitions={raceDefinitions}
        venues={venues}
        redirectTo={eventHref}
      />
    </AdminFormPage>
  );
}
