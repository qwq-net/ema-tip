import { getEntriesForRace, getRaceById } from '@/features/admin/manage-entries/actions';
import { getMyForecast } from '@/features/forecasts/actions';
import { ForecastInputForm } from '@/features/forecasts/components/ForecastInputForm';
import { Badge } from '@/shared/ui/badge';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Button } from '@/shared/ui/button';
import { FormattedDate } from '@/shared/ui/formatted-date';
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
    <div className="mx-auto max-w-4xl space-y-6">
      <Breadcrumbs items={[{ label: '予想入力', href: '/admin/forecasts' }, { label: race.name }]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-text-main text-2xl font-semibold tracking-tight">{race.name}</h1>
            <div className="text-text-sub mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <FormattedDate date={race.date} options={{ month: 'long', day: 'numeric', weekday: 'short' }} />
                <span>{race.venue.name}</span>
                {race.raceNumber && <span>{race.raceNumber}R</span>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="surface" label={race.surface} />
                <span className="font-semibold">{race.distance}m</span>
              </div>
              <div className="flex items-center gap-2">
                <span>馬場:</span>
                <Badge variant="condition" label={race.condition || '良'} />
              </div>
            </div>
          </div>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href={`/races/${raceId}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            投票ページへ
          </Link>
        </Button>
      </div>

      <ForecastInputForm
        raceId={raceId}
        entries={entries.map((entry) => ({
          ...entry,
          horseAge: entry.horseAge ?? 0,
        }))}
        initialForecast={myForecast}
      />
    </div>
  );
}
