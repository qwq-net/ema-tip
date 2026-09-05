import { getRaceDefinitions } from '@/features/admin/manage-race-definitions/actions';
import { getEvents } from '@/features/admin/manage-races/actions';
import { RaceForm } from '@/features/admin/manage-races/ui/race-form';
import { getVenues } from '@/features/admin/manage-venues/actions';
import { AdminBackLink, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';

export default async function CreateRacePage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const [{ eventId }, events, raceDefinitions, venues] = await Promise.all([
    searchParams,
    getEvents(),
    getRaceDefinitions(),
    getVenues(),
  ]);
  // イベント詳細から来た場合はそのイベントを初期選択し、保存後もそのイベントへ戻す
  const eventHref = eventId && events.some((e) => e.id === eventId) ? `/admin/events/${eventId}` : '/admin/events';

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <AdminBackLink href={eventHref}>
          {eventHref === '/admin/events' ? 'イベント一覧へ戻る' : 'イベントへ戻る'}
        </AdminBackLink>
      </div>

      <div className="mb-8">
        <AdminPageHeader title="新規レース登録" description="新しいレースの基本情報を入力してください。" />
      </div>

      <Card className="p-6">
        <RaceForm
          events={events}
          defaultEventId={eventId}
          raceDefinitions={raceDefinitions}
          venues={venues}
          redirectTo={eventHref}
        />
      </Card>
    </div>
  );
}
