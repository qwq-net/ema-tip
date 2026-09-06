import { getRaceById } from '@/features/admin/manage-entries/actions';
import { getRaceDefinitions } from '@/features/admin/manage-race-definitions/actions';
import { getEvents } from '@/features/admin/manage-races/actions';
import { RaceForm } from '@/features/admin/manage-races/ui/race-form';
import { getVenues } from '@/features/admin/manage-venues/actions';
import { Card } from '@/shared/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'レース情報の編集',
};

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

  // updateRace は払戻確定後の編集を拒否するため、操作できない状態では編集 UI を出さない
  if (race.status === 'FINALIZED') {
    return <Card className="max-w-2xl p-6 text-sm text-gray-500">払戻確定後はレース情報を変更できません。</Card>;
  }

  return (
    <Card className="max-w-2xl p-6">
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
  );
}
