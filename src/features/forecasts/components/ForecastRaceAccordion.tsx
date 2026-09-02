'use client';

import { getDisplayStatus } from '@/entities/race/lib/status';
import { RaceListTable } from '@/entities/race/ui/race-list-table';
import { Badge } from '@/shared/ui';
import { PersistedAccordion, PersistedAccordionHeader, PersistedAccordionItem } from '@/shared/ui/persisted-accordion';
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
            <PersistedAccordionHeader
              name={event.name}
              date={event.date}
              badge={<Badge variant="status" label={getDisplayStatus(event.status, false)} />}
              countLabel={`${event.races.length}レース`}
            />
          }
        >
          <RaceListTable
            races={event.races}
            hrefFor={(race) => `/admin/forecasts/${event.id}/races/${race.id}`}
            nameExtra={(race) => (
              <Link
                href={`/races/${race.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-sub hover:text-gray-600"
                title="投票ページを開く"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
            tail={{
              header: '状態',
              cell: (race) => (
                <Badge
                  variant="status"
                  label={getDisplayStatus(race.status, race.entries?.some((e) => e.finishPosition !== null) ?? false)}
                />
              ),
            }}
            emptyMessage="このイベントにレースはありません"
          />
        </PersistedAccordionItem>
      ))}
    </PersistedAccordion>
  );
}
