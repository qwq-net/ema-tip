import { formatRaceLabel } from '@/entities/race/lib/label';
import { RacePageHeader } from '@/entities/race/ui/race-page-header';
import { UpdateNetkeibaOddsButton } from '@/features/admin/import-race/ui/update-odds-button';
import { getRaceById } from '@/features/admin/manage-entries/actions';
import { deleteRace } from '@/features/admin/manage-races/actions';
import { ConfirmDeleteButton } from '@/features/admin/shared/ui/confirm-delete-button';
import { AdminPage } from '@/features/admin/ui/admin-page';
import { AdminTabs } from '@/features/admin/ui/admin-tabs';
import { db } from '@/shared/db';
import { raceEntries } from '@/shared/db/schema';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { and, count, eq } from 'drizzle-orm';
import { ClipboardList, Flag, Pencil, Ticket } from 'lucide-react';
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
    <AdminPage>
      <Breadcrumbs
        items={[
          { label: 'イベント管理', href: '/admin/events' },
          { label: race.event.name, href: `/admin/events/${race.eventId}` },
          {
            label: formatRaceLabel({
              venueShortName: race.venue.shortName,
              raceNumber: race.raceNumber,
              name: race.name,
            }),
          },
        ]}
      />
      <RacePageHeader
        venueShortName={race.venue.shortName}
        raceNumber={race.raceNumber}
        name={race.name}
        netkeibaUrl={race.netkeibaUrl}
        surface={race.surface}
        distance={race.distance}
        entrantCount={entrantRows[0]?.value ?? 0}
        actions={
          <>
            {race.netkeibaUrl && <UpdateNetkeibaOddsButton raceId={race.id} />}
            <ConfirmDeleteButton
              title="レースの削除"
              itemName={race.name}
              onDelete={deleteRace.bind(null, race.id)}
              redirectTo={`/admin/events/${race.eventId}`}
              description={`「${race.name}」と出走馬・予想を削除します。馬券の購入がある場合、またはBET5の対象レースの場合は削除できません。`}
            />
          </>
        }
      />
      <AdminTabs
        items={[
          { href: base, label: '確定・設定', icon: <Flag /> },
          { href: `${base}/entries`, label: '出走馬', icon: <ClipboardList /> },
          { href: `${base}/bets`, label: '馬券', icon: <Ticket /> },
          { href: `${base}/edit`, label: '編集', icon: <Pencil /> },
        ]}
      />
      {children}
    </AdminPage>
  );
}
