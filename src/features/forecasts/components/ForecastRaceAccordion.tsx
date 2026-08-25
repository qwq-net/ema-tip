'use client';

import { getDisplayStatus } from '@/entities/race/lib/status';
import { Badge } from '@/shared/ui';
import { PersistedAccordion } from '@/shared/ui/persisted-accordion';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ForecastRaceAccordionProps {
  events: Array<{
    id: string;
    name: string;
    date: string;
    status: string;
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

const STORAGE_KEY = 'forecast-race-accordion-open-items_v2';

export function ForecastRaceAccordion({ events }: ForecastRaceAccordionProps) {
  return (
    <PersistedAccordion
      storageKey={STORAGE_KEY}
      allIds={events.map((e) => e.id)}
      emptyState={<div className="py-12 text-center text-gray-500">登録されているレースはありません</div>}
    >
      {events.map((event) => (
        <Accordion.Item key={event.id} value={event.id}>
          <Accordion.Header className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-base font-semibold hover:bg-gray-100">
            <Accordion.Trigger className="flex w-full items-center justify-between">
              <div className="flex items-center gap-4">
                <span>{event.name}</span>
                <Badge variant="status" label={getDisplayStatus(event.status, false)} />
                <span className="text-sm font-normal text-gray-500">{event.races.length}レース</span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-400 transition-transform duration-300 ease-in-out data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
            <div className="border-t border-gray-100">
              {event.races.length === 0 ? (
                <div className="py-8 text-center text-gray-500">このイベントにレースはありません</div>
              ) : (
                <table className="w-full min-w-[800px] border-collapse">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-sm font-medium tracking-wider whitespace-nowrap text-gray-400 uppercase">
                        番号
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium tracking-wider whitespace-nowrap text-gray-400 uppercase">
                        レース名
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium tracking-wider whitespace-nowrap text-gray-400 uppercase">
                        場所
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium tracking-wider whitespace-nowrap text-gray-400 uppercase">
                        距離
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium tracking-wider whitespace-nowrap text-gray-400 uppercase">
                        馬場
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium tracking-wider whitespace-nowrap text-gray-400 uppercase">
                        状態
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {event.races.map((race) => (
                      <tr key={race.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                          {race.raceNumber ? `${race.raceNumber}R` : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/forecasts/${event.id}/races/${race.id}`}
                              className="text-primary hover:text-primary-hover font-semibold hover:underline"
                            >
                              {race.name}
                            </Link>
                            <Link
                              href={`/races/${race.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-gray-600"
                              title="投票ページを開く"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </div>
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
      ))}
    </PersistedAccordion>
  );
}
