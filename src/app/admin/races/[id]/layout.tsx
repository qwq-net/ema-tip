import { RacePageHeader } from '@/entities/race/ui/race-page-header';
import { UpdateNetkeibaOddsButton } from '@/features/admin/import-race/ui/update-odds-button';
import { getRaceById } from '@/features/admin/manage-entries/actions';
import { AdminBackLink } from '@/features/admin/ui/admin-page-header';
import { AdminTabs } from '@/features/admin/ui/admin-tabs';
import { db } from '@/shared/db';
import { raceEntries } from '@/shared/db/schema';
import { and, count, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

/** レース詳細の共通枠。見出しとタブを持ち、配下の確定・出走馬・編集の各ページを切り替える。 */
export default async function RaceDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [race, entrantRows] = await Promise.all([
    getRaceById(id),
    db
      .select({ value: count() })
      .from(raceEntries)
      .where(and(eq(raceEntries.raceId, id), eq(raceEntries.status, 'ENTRANT'))),
  ]);
  if (!race) {
    notFound();
  }

  const base = `/admin/races/${id}`;

  return (
    <div className="space-y-6">
      <AdminBackLink href={`/admin/events/${race.eventId}`}>イベントへ戻る</AdminBackLink>
      <RacePageHeader
        venueShortName={race.venue.shortName}
        raceNumber={race.raceNumber}
        eventName={race.event.name}
        eventHref={`/admin/events/${race.eventId}`}
        name={race.name}
        netkeibaUrl={race.netkeibaUrl}
        surface={race.surface}
        distance={race.distance}
        entrantCount={entrantRows[0]?.value ?? 0}
        actions={
          race.netkeibaUrl ? (
            <UpdateNetkeibaOddsButton
              raceId={race.id}
              className="border-blue-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50"
            />
          ) : undefined
        }
      />
      <AdminTabs
        items={[
          { href: base, label: '確定・設定' },
          { href: `${base}/entries`, label: '出走馬' },
          { href: `${base}/bets`, label: '馬券' },
          { href: `${base}/edit`, label: '編集' },
        ]}
      />
      {children}
    </div>
  );
}
