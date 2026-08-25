import { getRaceById } from '@/features/admin/manage-entries/actions';
import { getRaceDefinitions } from '@/features/admin/manage-race-definitions/actions';
import { getEvents } from '@/features/admin/manage-races/actions';
import { RaceForm } from '@/features/admin/manage-races/ui/race-form';
import { getVenues } from '@/features/admin/manage-venues/actions';
import { Card } from '@/shared/ui';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

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

  async function onSuccess() {
    'use server';
    redirect(`/admin/races/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={`/admin/races/${id}`}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ChevronLeft size={16} />
          レース確定画面へ戻る
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">レース情報の編集</h1>
        <p className="mt-1 text-gray-500">レース情報を編集します。</p>
      </div>

      <Card className="p-6">
        <RaceForm
          initialData={{
            ...race,
            raceNumber: race.raceNumber,
            condition: race.condition as '良' | '稍重' | '重' | '不良' | null,
            surface: race.surface as '芝' | 'ダート',
            venueId: race.venueId || undefined,
            direction: race.direction || undefined,
          }}
          events={events}
          raceDefinitions={raceDefinitions}
          venues={venues}
          onSuccess={onSuccess}
        />
      </Card>
    </div>
  );
}
