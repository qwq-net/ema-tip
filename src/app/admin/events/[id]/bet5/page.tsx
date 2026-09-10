import { getBet5AdminData } from '@/features/admin/bet5/queries';
import { Bet5AdminView } from '@/features/admin/bet5/ui/bet5-admin-view';
import { getBet5TicketsAction } from '@/features/betting/actions/bet5';
import { db } from '@/shared/db';
import { raceEntries } from '@/shared/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'BET5 管理',
};

export default async function Bet5AdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const adminData = await getBet5AdminData(id);
  if (!adminData) {
    notFound();
  }
  const { event, races, bet5Event, horseMap } = adminData;

  let tickets: Awaited<ReturnType<typeof getBet5TicketsAction>> = [];
  let winnerRows: { raceId: string; horseId: string }[] = [];
  if (bet5Event) {
    const targetRaceIds = [
      bet5Event.race1Id,
      bet5Event.race2Id,
      bet5Event.race3Id,
      bet5Event.race4Id,
      bet5Event.race5Id,
    ];
    [tickets, winnerRows] = await Promise.all([
      getBet5TicketsAction(bet5Event.id),
      db.query.raceEntries.findMany({
        where: and(inArray(raceEntries.raceId, targetRaceIds), eq(raceEntries.finishPosition, 1)),
        columns: {
          raceId: true,
          horseId: true,
        },
      }),
    ]);
  }

  return (
    <Bet5AdminView
      eventId={id}
      event={event}
      races={races}
      bet5Event={bet5Event}
      horseMap={horseMap}
      tickets={tickets}
      winnerRows={winnerRows}
    />
  );
}
