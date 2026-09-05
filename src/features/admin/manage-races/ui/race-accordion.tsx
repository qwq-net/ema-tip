'use client';

import { getDisplayStatus } from '@/entities/race/lib/status';
import { RaceListTable } from '@/entities/race/ui/race-list-table';
import { Badge, Button } from '@/shared/ui';
import { PersistedAccordion, PersistedAccordionHeader, PersistedAccordionItem } from '@/shared/ui/persisted-accordion';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface RaceAccordionProps {
  events: {
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
    races: {
      id: string;
      name: string;
      raceNumber: number | null;
      distance: number;
      surface: string;
      condition: string | null;
      status: string;
      closingAt: Date | null;
      entries?: { finishPosition: number | null }[];
      venueId?: string;
      raceDefinitionId?: string | null;
      direction?: string | null;
      venue?: {
        name: string;
      };
    }[];
  }[];
}

const STORAGE_KEY = 'race-accordion-open-items_v2';

function areBet5TargetRacesFinished(bet5Event: NonNullable<RaceAccordionProps['events'][number]['bet5Event']>) {
  return [bet5Event.race1, bet5Event.race2, bet5Event.race3, bet5Event.race4, bet5Event.race5].every(
    (race) => race?.status === 'FINALIZED'
  );
}

type Bet5GuideKind = 'setup' | 'close' | 'payout';

// BET5 導線の文言と配色の単一管理点。慣習色の直書きをこのファイルに閉じるためここに置く
const BET5_GUIDES = {
  setup: { label: 'BET5が設定できます', className: 'border-blue-200 text-blue-700 hover:bg-blue-50' },
  close: { label: 'BET5を締め切り忘れていませんか？', className: 'border-amber-200 text-amber-700 hover:bg-amber-50' },
  payout: { label: 'BET5の払戻を忘れていませんか？', className: 'border-red-200 text-red-700 hover:bg-red-50' },
} satisfies Record<Bet5GuideKind, { label: string; className: string }>;

/**
 * イベントの BET5 状態から管理者へ案内する導線を選ぶ。案内不要なら null。
 * 開催終了と BET5 払戻済みでは何も案内しない。3 つの状態は同時に成立しないため常に 1 つだけ返る。
 */
function getBet5Guide(event: RaceAccordionProps['events'][number]): Bet5GuideKind | null {
  if (event.status === 'COMPLETED' || event.bet5Event?.status === 'FINALIZED') return null;

  if (!event.bet5Event) {
    return event.status === 'SCHEDULED' || event.status === 'ACTIVE' ? 'setup' : null;
  }

  if (event.status !== 'ACTIVE') return null;
  if (event.bet5Event.status === 'SCHEDULED') return 'close';
  if (event.bet5Event.status === 'CLOSED' && areBet5TargetRacesFinished(event.bet5Event)) return 'payout';
  return null;
}

export function RaceAccordion({ events }: RaceAccordionProps) {
  return (
    <PersistedAccordion
      storageKey={STORAGE_KEY}
      allIds={events.map((e) => e.id)}
      emptyState="登録されているレースはありません"
    >
      {events.map((event) => {
        const bet5Guide = getBet5Guide(event);

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
                {bet5Guide && (
                  <Button asChild variant="outline" size="sm" className={BET5_GUIDES[bet5Guide].className}>
                    <Link href={`/admin/events/${event.id}/bet5`} onClick={(e) => e.stopPropagation()}>
                      {BET5_GUIDES[bet5Guide].label}
                      <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
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
