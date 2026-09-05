import { getRaceDefinitions } from '@/features/admin/manage-race-definitions/actions';
import { getEvents } from '@/features/admin/manage-races/actions';
import { RaceForm } from '@/features/admin/manage-races/ui/race-form';
import { getVenues } from '@/features/admin/manage-venues/actions';
import { AdminBackLink, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';

export default async function CreateRacePage() {
  const [events, raceDefinitions, venues] = await Promise.all([getEvents(), getRaceDefinitions(), getVenues()]);

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <AdminBackLink href="/admin/races">レース一覧へ戻る</AdminBackLink>
      </div>

      <div className="mb-8">
        <AdminPageHeader title="新規レース登録" description="新しいレースの基本情報を入力してください。" />
      </div>

      <Card className="p-6">
        <RaceForm events={events} raceDefinitions={raceDefinitions} venues={venues} redirectTo="/admin/races" />
      </Card>
    </div>
  );
}
