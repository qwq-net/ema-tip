import { getRaceById } from '@/features/admin/manage-entries/actions';
import { getRaceDefinitions } from '@/features/admin/manage-race-definitions/actions';
import { getEvents } from '@/features/admin/manage-races/actions';
import { RaceForm } from '@/features/admin/manage-races/ui/race-form';
import { getVenues } from '@/features/admin/manage-venues/actions';
import { AdminBackLink, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { notFound } from 'next/navigation';

export default async function EditRacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [race, events, raceDefinitions, venues] = await Promise.all([
    getRaceById(id),
    getEvents(),
    getRaceDefinitions(),
    getVenues(),
  ]);

  if (!race) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <AdminBackLink href={`/admin/races/${id}`}>レース確定画面へ戻る</AdminBackLink>
      </div>

      <div className="mb-8">
        <AdminPageHeader title="レース情報の編集" description="レース情報を編集します。" />
      </div>

      <Card className="p-6">
        <RaceForm
          key={race.updatedAt.toISOString()}
          initialData={{
            ...race,
            raceNumber: race.raceNumber,
            condition: race.condition,
            surface: race.surface,
          }}
          events={events}
          raceDefinitions={raceDefinitions}
          venues={venues}
          redirectTo={`/admin/races/${id}`}
        />
      </Card>
    </div>
  );
}
