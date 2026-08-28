'use client';

import { getDisplayStatus } from '@/entities/race/lib/status';
import { Badge, TableBody, TableHead, TableRow, Td, Th } from '@/shared/ui';
import { PersistedAccordion, PersistedAccordionItem } from '@/shared/ui/persisted-accordion';
import { ExternalLink } from 'lucide-react';
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
      emptyState="登録されているレースはありません"
    >
      {events.map((event) => (
        <PersistedAccordionItem
          key={event.id}
          value={event.id}
          header={
            <div className="flex items-center gap-4">
              <span>{event.name}</span>
              <Badge variant="status" label={getDisplayStatus(event.status, false)} />
              <span className="text-sm font-normal text-gray-500">{event.races.length}レース</span>
            </div>
          }
        >
          {event.races.length === 0 ? (
            <div className="py-8 text-center text-gray-500">このイベントにレースはありません</div>
          ) : (
            <table className="w-full min-w-[800px] border-collapse">
              <TableHead>
                <Th>番号</Th>
                <Th>レース名</Th>
                <Th>場所</Th>
                <Th>距離</Th>
                <Th>馬場</Th>
                <Th>状態</Th>
              </TableHead>
              <TableBody>
                {event.races.map((race) => (
                  <TableRow key={race.id}>
                    <Td className="font-medium text-gray-900">{race.raceNumber ? `${race.raceNumber}R` : '-'}</Td>
                    <Td className="font-medium">
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
                    </Td>
                    <Td className="text-gray-500">{race.venue?.name}</Td>
                    <Td className="text-gray-500">{race.distance}m</Td>
                    <Td className="text-gray-500">
                      {race.surface} {race.condition || ''}
                    </Td>
                    <Td>
                      <Badge
                        variant="status"
                        label={getDisplayStatus(
                          race.status,
                          race.entries?.some((e) => e.finishPosition !== null) ?? false
                        )}
                      />
                    </Td>
                  </TableRow>
                ))}
              </TableBody>
            </table>
          )}
        </PersistedAccordionItem>
      ))}
    </PersistedAccordion>
  );
}
