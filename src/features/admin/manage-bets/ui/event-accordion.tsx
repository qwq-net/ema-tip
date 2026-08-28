'use client';

import { getDisplayStatus } from '@/entities/race/lib/status';
import { RaceListTable } from '@/entities/race/ui/race-list-table';
import { Badge } from '@/shared/ui';
import { PersistedAccordion, PersistedAccordionHeader, PersistedAccordionItem } from '@/shared/ui/persisted-accordion';

interface Race {
  id: string;
  name: string;
  raceNumber: number | null;
  distance: number;
  surface: string;
  condition: string | null;
  date: string;
  entryCount: number;
  venue: {
    shortName: string;
    name: string;
  };
}

interface Event {
  id: string;
  name: string;
  date: string;
  status: string;
  races: Race[];
}

interface EventAccordionProps {
  events: Event[];
}

const STORAGE_KEY = 'event-accordion-open-items_v2';

export function EventAccordion({ events }: EventAccordionProps) {
  return (
    <PersistedAccordion
      storageKey={STORAGE_KEY}
      allIds={events.map((e) => e.id)}
      emptyState="登録されているイベントはありません"
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
            hrefFor={(race) => `/admin/bets/${race.id}`}
            tail={{
              header: '頭数',
              cell: (race) => (
                <Badge label={`${race.entryCount}頭`} className="bg-blue-50 text-blue-700 ring-blue-200" />
              ),
            }}
            emptyMessage="このイベントにはレースが登録されていません"
          />
        </PersistedAccordionItem>
      ))}
    </PersistedAccordion>
  );
}
