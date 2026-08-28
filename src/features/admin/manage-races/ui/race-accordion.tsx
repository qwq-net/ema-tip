'use client';

import { getDisplayStatus } from '@/entities/race/lib/status';
import { RaceListTable } from '@/entities/race/ui/race-list-table';
import { Badge } from '@/shared/ui';
import { PersistedAccordion, PersistedAccordionHeader, PersistedAccordionItem } from '@/shared/ui/persisted-accordion';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface RaceAccordionProps {
  events: Array<{
    id: string;
    name: string;
    date: string;
    status: string;
    bet5Event?: {
      id: string;
      status: string;
      race1?: { status: string } | null;
      race2?: { status: string } | null;
      race3?: { status: string } | null;
      race4?: { status: string } | null;
      race5?: { status: string } | null;
    } | null;
    races: Array<{
      id: string;
      name: string;
      raceNumber: number | null;
      distance: number;
      surface: string;
      condition: string | null;
      status: string;
      closingAt: Date | null;
      entries?: Array<{ finishPosition: number | null }>;
      venueId?: string;
      raceDefinitionId?: string | null;
      direction?: string | null;
      venue?: {
        name: string;
      };
    }>;
  }>;
}

const STORAGE_KEY = 'race-accordion-open-items_v2';

function areBet5TargetRacesFinished(bet5Event: NonNullable<RaceAccordionProps['events'][number]['bet5Event']>) {
  return [bet5Event.race1, bet5Event.race2, bet5Event.race3, bet5Event.race4, bet5Event.race5].every(
    (race) => race?.status === 'FINALIZED'
  );
}

export function RaceAccordion({ events }: RaceAccordionProps) {
  return (
    <PersistedAccordion
      storageKey={STORAGE_KEY}
      allIds={events.map((e) => e.id)}
      emptyState="登録されているレースはありません"
    >
      {events.map((event) => {
        const isEventCompleted = event.status === 'COMPLETED';
        const isBet5Finalized = event.bet5Event?.status === 'FINALIZED';
        const shouldHideBet5Guide = isEventCompleted || isBet5Finalized;

        const showBet5SetupLink =
          !shouldHideBet5Guide && (event.status === 'SCHEDULED' || event.status === 'ACTIVE') && !event.bet5Event;

        const showBet5CloseReminder =
          !shouldHideBet5Guide && event.status === 'ACTIVE' && event.bet5Event?.status === 'SCHEDULED';

        const showBet5PayoutReminder =
          !shouldHideBet5Guide &&
          event.status === 'ACTIVE' &&
          event.bet5Event?.status === 'CLOSED' &&
          areBet5TargetRacesFinished(event.bet5Event);

        return (
          <PersistedAccordionItem
            key={event.id}
            value={event.id}
            header={
              <PersistedAccordionHeader
                name={event.name}
                date={event.date}
                badge={<Badge variant="status" label={getDisplayStatus(event.status, false)} />}
                countLabel={`${event.races.length}レース`}
              >
                {showBet5SetupLink && (
                  <Link
                    href={`/admin/events/${event.id}/bet5`}
                    className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    BET5が設定できます
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Link>
                )}
                {showBet5CloseReminder && (
                  <Link
                    href={`/admin/events/${event.id}/bet5`}
                    className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    BET5を締め切り忘れていませんか？
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Link>
                )}
                {showBet5PayoutReminder && (
                  <Link
                    href={`/admin/events/${event.id}/bet5`}
                    className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    BET5を払い戻し忘れていませんか？
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Link>
                )}
              </PersistedAccordionHeader>
            }
          >
            <RaceListTable
              races={event.races}
              hrefFor={(race) => `/admin/races/${race.id}`}
              tail={{
                header: '状態',
                cell: (race) => (
                  <Badge
                    variant="status"
                    label={getDisplayStatus(race.status, race.entries?.some((e) => e.finishPosition !== null) ?? false)}
                  />
                ),
              }}
              emptyMessage="登録されているレースがありません"
            />
          </PersistedAccordionItem>
        );
      })}
    </PersistedAccordion>
  );
}
