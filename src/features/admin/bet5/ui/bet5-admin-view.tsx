import { getDisplayStatus } from '@/entities/race/lib/status';
import type { getBet5AdminData } from '@/features/admin/bet5/queries';
import { Bet5ConfigForm } from '@/features/admin/bet5/ui/bet5-config-form';
import { Bet5ManageCard } from '@/features/admin/bet5/ui/bet5-manage-card';
import { Bet5TicketList } from '@/features/admin/bet5/ui/bet5-ticket-list';
import { EmptyState } from '@/shared/ui';
import { Crown } from 'lucide-react';
import type { ComponentProps } from 'react';

type Bet5AdminData = NonNullable<Awaited<ReturnType<typeof getBet5AdminData>>>;
type Bet5Ticket = ComponentProps<typeof Bet5TicketList>['tickets'][number];
type TargetRace = ComponentProps<typeof Bet5ManageCard>['targetRaces'][number];
type RaceLiveStat = ComponentProps<typeof Bet5ManageCard>['raceLiveStats'][number];

// BET5 の設定に必要な最小のレース数。5 重勝なので締め切られていないレースが 5 件必要
const REQUIRED_RACE_COUNT = 5;

/** 対象レースの 1 着馬を、レースごとに 1 頭だけ確定した形へ畳む。同着や未確定は null にして集計から外す。 */
function toWinnerByRaceId(raceIds: string[], winnerRows: { raceId: string; horseId: string }[]): Map<string, string> {
  const winnersByRaceId = new Map<string, Set<string>>();
  winnerRows.forEach((row) => {
    let winners = winnersByRaceId.get(row.raceId);
    if (!winners) {
      winners = new Set<string>();
      winnersByRaceId.set(row.raceId, winners);
    }
    winners.add(row.horseId);
  });

  const resolved = new Map<string, string>();
  raceIds.forEach((raceId) => {
    const [winner, ...rest] = winnersByRaceId.get(raceId) ?? [];
    if (winner !== undefined && rest.length === 0) resolved.set(raceId, winner);
  });
  return resolved;
}

/** 馬券の position 番目のレースで選んだ馬を返す。position は 1 起点。 */
function getRaceHorseIds(ticket: Bet5Ticket, position: number): string[] {
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
}

/**
 * 着順が確定したレースについて、そのレース単体の的中数と先頭からの連続的中数を数える。
 * 1 着が確定していないレースは的中数を null にし、途中に null があると以降の連続的中も null になる。
 * 未確定のレースは結果に含めない。
 */
function buildRaceLiveStats(
  targetRaces: TargetRace[],
  tickets: Bet5Ticket[],
  winnerByRaceId: Map<string, string>
): RaceLiveStat[] {
  const isResolved = (status: string) => status === 'RANKING_CONFIRMED' || status === 'FINALIZED';

  return targetRaces
    .map((race, index): RaceLiveStat | null => {
      if (!isResolved(race.status)) return null;

      const base = {
        raceId: race.id,
        raceNumber: race.raceNumber,
        raceName: race.name,
        entryCount: race.entryCount,
      };
      const winnerHorseId = winnerByRaceId.get(race.id);
      if (winnerHorseId === undefined) {
        return { ...base, hitCount: null, consecutiveHitCount: null };
      }

      const upToHere = targetRaces.slice(0, index + 1);
      const canComputeConsecutive = upToHere.every((targetRace) => winnerByRaceId.has(targetRace.id));

      return {
        ...base,
        hitCount: tickets.filter((ticket) => getRaceHorseIds(ticket, index + 1).includes(winnerHorseId)).length,
        consecutiveHitCount: canComputeConsecutive
          ? tickets.filter((ticket) =>
              upToHere.every((targetRace, pos) => {
                const winner = winnerByRaceId.get(targetRace.id);
                return winner !== undefined && getRaceHorseIds(ticket, pos + 1).includes(winner);
              })
            ).length
          : null,
      };
    })
    .filter((stat): stat is RaceLiveStat => stat !== null);
}

interface Bet5AdminViewProps {
  eventId: string;
  event: Bet5AdminData['event'];
  races: Bet5AdminData['races'];
  bet5Event: Bet5AdminData['bet5Event'];
  horseMap: Bet5AdminData['horseMap'];
  /** 購入済みの BET5。未設定のイベントでは空配列を渡す。 */
  tickets: Bet5Ticket[];
  /** 対象レースの 1 着馬。未確定のレースは行が無い。 */
  winnerRows: { raceId: string; horseId: string }[];
}

/**
 * BET5 管理タブの本体。未設定なら設定フォーム、設定済みなら管理カードと購入一覧を出す。
 * 締め切られていないレースが 5 件に満たない場合は設定できない旨だけを示す。
 */
export function Bet5AdminView({ eventId, event, races, bet5Event, horseMap, tickets, winnerRows }: Bet5AdminViewProps) {
  const targetRaceIds = bet5Event
    ? [bet5Event.race1Id, bet5Event.race2Id, bet5Event.race3Id, bet5Event.race4Id, bet5Event.race5Id]
    : [];
  const winnerByRaceId = toWinnerByRaceId(targetRaceIds, winnerRows);

  const targetRaces: TargetRace[] = targetRaceIds
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
    }));

  // BET5に設定できるのは締め切られていないレースのみ
  const selectableRaces = races.filter((race) => race.status === 'SCHEDULED');

  if (!bet5Event) {
    return (
      <div className="max-w-4xl space-y-6">
        {selectableRaces.length >= REQUIRED_RACE_COUNT ? (
          <Bet5ConfigForm
            eventId={eventId}
            eventName={event.name}
            defaultInitialPot={event.distributeAmount * 10}
            races={selectableRaces.map((r) => ({ id: r.id, raceNumber: r.raceNumber, name: r.name }))}
          />
        ) : (
          <EmptyState
            icon={Crown}
            title="BET5を設定できません"
            description={`BET5の設定には締め切られていないレースが5件以上必要です。現在は ${selectableRaces.length} 件です。`}
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <Bet5ManageCard
        bet5Event={bet5Event}
        eventId={eventId}
        distributeAmount={event.distributeAmount}
        targetRaces={targetRaces}
        raceLiveStats={buildRaceLiveStats(targetRaces, tickets, winnerByRaceId)}
      />
      <div className="border-t border-gray-100 pt-8">
        <Bet5TicketList tickets={tickets} horseMap={horseMap} isFinalized={bet5Event.status === 'FINALIZED'} />
      </div>
    </div>
  );
}
