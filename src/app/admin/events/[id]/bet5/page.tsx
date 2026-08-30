import { getDisplayStatus } from '@/entities/race/lib/status';
import { getBet5AdminData } from '@/features/admin/bet5/queries';
import { Bet5ConfigForm } from '@/features/admin/bet5/ui/bet5-config-form';
import { Bet5ManageCard } from '@/features/admin/bet5/ui/bet5-manage-card';
import { Bet5TicketList } from '@/features/admin/bet5/ui/bet5-ticket-list';
import { getBet5TicketsAction } from '@/features/betting/actions/bet5';
import { db } from '@/shared/db';
import { raceEntries } from '@/shared/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function Bet5AdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const adminData = await getBet5AdminData(id);

  if (!adminData) {
    notFound();
  }

  const { event, races, bet5Event, horseMap } = adminData;

  let tickets: Awaited<ReturnType<typeof getBet5TicketsAction>> = [];
  let winnerRows: Array<{ raceId: string; horseId: string }> = [];

  const targetRaceIds = bet5Event
    ? [bet5Event.race1Id, bet5Event.race2Id, bet5Event.race3Id, bet5Event.race4Id, bet5Event.race5Id]
    : [];

  if (bet5Event) {
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

  const targetRaces = bet5Event
    ? targetRaceIds
        .map((raceId) => races.find((race) => race.id === raceId))
        .filter((race): race is (typeof races)[number] => race !== undefined)
        .map((race) => ({
          id: race.id,
          raceNumber: race.raceNumber,
          name: race.name,
          // DB の status は着順確定を表現しない。1着が記録済みなら RANKING_CONFIRMED として扱う
          status: getDisplayStatus(
            race.status,
            winnerRows.some((row) => row.raceId === race.id)
          ),
          entryCount: race.entries.length,
        }))
    : [];

  const winnerHorseIdByRaceId = new Map<string, string | null>();
  const winnerSetByRaceId = new Map<string, Set<string>>();
  winnerRows.forEach((row) => {
    if (!winnerSetByRaceId.has(row.raceId)) {
      winnerSetByRaceId.set(row.raceId, new Set<string>());
    }
    winnerSetByRaceId.get(row.raceId)!.add(row.horseId);
  });
  targetRaceIds.forEach((raceId) => {
    const set = winnerSetByRaceId.get(raceId);
    winnerHorseIdByRaceId.set(raceId, set && set.size === 1 ? [...set][0] : null);
  });

  const isRaceResolved = (status: string) => status === 'RANKING_CONFIRMED' || status === 'FINALIZED';
  type Bet5Ticket = (typeof tickets)[number];
  const getRaceHorseIds = (ticket: Bet5Ticket, position: number) => {
    switch (position) {
      case 1:
        return ticket.race1HorseIds;
      case 2:
        return ticket.race2HorseIds;
      case 3:
        return ticket.race3HorseIds;
      case 4:
        return ticket.race4HorseIds;
      case 5:
        return ticket.race5HorseIds;
      default:
        return [];
    }
  };

  const raceLiveStats = targetRaces
    .map((race, index) => {
      if (!isRaceResolved(race.status)) return null;

      const winnerHorseId = winnerHorseIdByRaceId.get(race.id);
      if (!winnerHorseId) {
        return {
          raceId: race.id,
          raceNumber: race.raceNumber,
          raceName: race.name,
          entryCount: race.entryCount,
          hitCount: null,
          consecutiveHitCount: null,
        };
      }

      const hitCount = tickets.filter((ticket) => getRaceHorseIds(ticket, index + 1).includes(winnerHorseId)).length;

      const canComputeConsecutive = targetRaces
        .slice(0, index + 1)
        .every((targetRace) => winnerHorseIdByRaceId.get(targetRace.id));

      const consecutiveHitCount = canComputeConsecutive
        ? tickets.filter((ticket) =>
            targetRaces.slice(0, index + 1).every((targetRace, pos) => {
              const winner = winnerHorseIdByRaceId.get(targetRace.id);
              if (!winner) return false;
              return getRaceHorseIds(ticket, pos + 1).includes(winner);
            })
          ).length
        : null;

      return {
        raceId: race.id,
        raceNumber: race.raceNumber,
        raceName: race.name,
        entryCount: race.entryCount,
        hitCount,
        consecutiveHitCount,
      };
    })
    .filter((stat): stat is NonNullable<typeof stat> => stat !== null);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Link
          href={`/admin/events/${id}`}
          className="mb-4 inline-flex items-center text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          イベント編集に戻る
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">BET5 管理</h1>
        <p className="mt-1 text-base text-gray-500">{event.name} のBET5設定と購入状況</p>
      </div>

      {!bet5Event ? (
        <Bet5ConfigForm eventId={id} races={races.map((r) => ({ id: r.id, raceNumber: r.raceNumber, name: r.name }))} />
      ) : (
        <div className="space-y-8">
          <Bet5ManageCard
            bet5Event={bet5Event}
            eventId={id}
            distributeAmount={event.distributeAmount}
            targetRaces={targetRaces}
            raceLiveStats={raceLiveStats}
          />
          <div className="border-t border-gray-100 pt-8">
            <Bet5TicketList tickets={tickets} horseMap={horseMap} isFinalized={bet5Event.status === 'FINALIZED'} />
          </div>
        </div>
      )}
    </div>
  );
}
