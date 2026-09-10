import { getRaceBetSummaries } from '@/features/admin/manage-bets/actions/read';
import { getEvent } from '@/features/admin/manage-events/actions';
import { EventRaces } from '@/features/admin/manage-events/ui/event-races';
import { db } from '@/shared/db';
import { raceInstances } from '@/shared/db/schema';
import { asc, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'イベントのレース',
};

export default async function EventRacesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, races, summaries] = await Promise.all([
    getEvent(id),
    db.query.raceInstances.findMany({
      where: eq(raceInstances.eventId, id),
      columns: { id: true, name: true, raceNumber: true, distance: true, surface: true, condition: true, status: true },
      with: {
        // 表の幅を抑えるため会場は略称で出す
        venue: { columns: { shortName: true } },
        // 状態バッジと頭数の表示にだけ使うため、entries は必要なカラムだけ返す
        entries: { columns: { finishPosition: true, status: true } },
      },
      orderBy: [asc(raceInstances.raceNumber), asc(raceInstances.name)],
    }),
    getRaceBetSummaries(id),
  ]);
  if (!event) {
    notFound();
  }

  return <EventRaces eventId={id} eventStatus={event.status} races={races} summaries={summaries} />;
}
