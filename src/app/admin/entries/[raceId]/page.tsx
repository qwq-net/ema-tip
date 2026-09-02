import { RacePageHeader } from '@/entities/race/ui/race-page-header';
import { EntryDnd, getAvailableHorses, getEntriesForRace, getRaceById } from '@/features/admin/manage-entries';
import { Card } from '@/shared/ui';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: '出走馬詳細',
};

type Props = {
  params: Promise<{ raceId: string }>;
};

export default async function RaceEntryPage({ params }: Props) {
  const { raceId } = await params;
  const race = await getRaceById(raceId);

  if (!race) {
    notFound();
  }

  const [availableHorses, existingEntries] = await Promise.all([getAvailableHorses(raceId), getEntriesForRace(raceId)]);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link
          href="/admin/entries"
          className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <RacePageHeader
            venueShortName={race.venue?.shortName}
            raceNumber={race.raceNumber}
            eventName={race.event?.name}
            name={race.name}
            netkeibaUrl={race.netkeibaUrl}
            surface={race.surface}
            distance={race.distance}
            entrantCount={existingEntries.filter((e) => e.status === 'ENTRANT').length}
          />
        </div>
      </div>

      <Card className="p-6">
        <EntryDnd raceId={raceId} availableHorses={availableHorses} existingEntries={existingEntries} />
      </Card>
    </div>
  );
}
