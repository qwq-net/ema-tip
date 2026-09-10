import { RacePageHeader } from '@/entities/race/ui/race-page-header';
import { getEntriesForRace, getRaceById } from '@/features/admin/manage-entries/actions';
import { AdminPage } from '@/features/admin/ui/admin-page';
import { getMyForecast } from '@/features/forecasts/actions';
import { ForecastInputForm } from '@/features/forecasts/components/ForecastInputForm';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Button } from '@/shared/ui/button';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ForecastInputPage({ params }: { params: Promise<{ eventId: string; raceId: string }> }) {
  const { raceId } = await params;

  const [race, entries, myForecast] = await Promise.all([
    getRaceById(raceId),
    getEntriesForRace(raceId),
    getMyForecast(raceId),
  ]);

  if (!race) {
    notFound();
  }

  return (
    <AdminPage width="medium">
      <Breadcrumbs items={[{ label: '予想入力', href: '/admin/forecasts' }, { label: race.name }]} />
      <RacePageHeader
        venueShortName={race.venue.shortName}
        raceNumber={race.raceNumber}
        name={race.name}
        surface={race.surface}
        distance={race.distance}
        entrantCount={entries.filter((entry) => entry.status === 'ENTRANT').length}
        actions={
          <Button asChild variant="outline">
            <Link href={`/races/${raceId}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              投票ページへ
            </Link>
          </Button>
        }
      />
      <ForecastInputForm
        raceId={raceId}
        entries={entries.map((entry) => ({
          ...entry,
          horseAge: entry.horseAge ?? 0,
        }))}
        initialForecast={myForecast}
      />
    </AdminPage>
  );
}
