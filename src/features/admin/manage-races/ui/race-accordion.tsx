'use client';

import { getDisplayStatus } from '@/entities/race/lib/status';
import { Badge } from '@/shared/ui';
import { PersistedAccordion } from '@/shared/ui/persisted-accordion';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown, ExternalLink } from 'lucide-react';
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
      emptyState={<div className="py-12 text-center text-gray-500">登録されているレースはありません</div>}
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
          <Accordion.Item key={event.id} value={event.id}>
            <Accordion.Header className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-base font-semibold hover:bg-gray-100">
              <Accordion.Trigger className="flex w-full items-center justify-between">
                <div className="flex items-center gap-4">
                  <span>{event.name}</span>
                  <span className="text-sm font-normal text-gray-500">{event.date}</span>
                  <Badge variant="status" label={getDisplayStatus(event.status, false)} />
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
                </div>
                <ChevronDown className="h-5 w-5 text-gray-400 transition-transform duration-300 ease-in-out data-[state=open]:rotate-180" />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
              <div className="border-t border-gray-100">
                {event.races.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">登録されているレースがありません</div>
                ) : (
                  <table className="w-full min-w-[800px] border-collapse">
                    <thead className="bg-gray-50">
                      <tr className="border-b border-gray-100">
                        <th className="px-6 py-3 text-left text-sm font-semibold tracking-wider whitespace-nowrap text-gray-400 uppercase">
                          番号
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold tracking-wider whitespace-nowrap text-gray-400 uppercase">
                          レース名
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold tracking-wider whitespace-nowrap text-gray-400 uppercase">
                          場所
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold tracking-wider whitespace-nowrap text-gray-400 uppercase">
                          距離
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold tracking-wider whitespace-nowrap text-gray-400 uppercase">
                          馬場
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold tracking-wider whitespace-nowrap text-gray-400 uppercase">
                          状態
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {event.races.map((race) => (
                        <tr key={race.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                            {race.raceNumber ? `${race.raceNumber}R` : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                            <Link
                              href={`/admin/races/${race.id}`}
                              className="text-primary hover:text-primary-hover font-semibold hover:underline"
                            >
                              {race.name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{race.venue?.name}</td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{race.distance}m</td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {race.surface} {race.condition || ''}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              variant="status"
                              label={getDisplayStatus(
                                race.status,
                                race.entries?.some((e) => e.finishPosition !== null) ?? false
                              )}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        );
      })}
    </PersistedAccordion>
  );
}
