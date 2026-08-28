'use client';

import { getDisplayStatus } from '@/entities/race/lib/status';
import { Badge } from '@/shared/ui';
import { PersistedAccordion, PersistedAccordionItem } from '@/shared/ui/persisted-accordion';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

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
            <div className="flex w-full items-center justify-start gap-4">
              <span>{event.name}</span>
              <Badge variant="status" label={getDisplayStatus(event.status, false)} />
              <span className="text-sm font-normal text-gray-500">{event.races.length}レース</span>
            </div>
          }
        >
          {event.races.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">このイベントにはレースが登録されていません</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {event.races.map((race) => (
                <Link
                  key={race.id}
                  href={`/admin/bets/${race.id}`}
                  className="flex items-center gap-8 px-6 py-3 pl-12 transition-colors hover:bg-gray-50"
                >
                  <div className="flex w-[240px] shrink-0 items-center gap-3">
                    <span className="flex h-6 w-8 shrink-0 items-center justify-center rounded bg-gray-100 text-sm font-semibold text-gray-600">
                      {race.raceNumber}R
                    </span>
                    <span className="truncate text-sm font-semibold text-blue-600 hover:underline">{race.name}</span>
                  </div>
                  <div className="w-[120px] shrink-0">
                    <span className="text-sm text-gray-600">{race.venue?.name}</span>
                  </div>
                  <div className="w-[80px] shrink-0">
                    <span className="text-sm text-gray-500">{race.distance}m</span>
                  </div>
                  <div className="w-[100px] shrink-0">
                    <span className="text-sm text-gray-500">
                      {race.surface} {race.condition || ''}
                    </span>
                  </div>
                  <div className="min-w-[80px]">
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-sm font-medium text-blue-700">
                      {race.entryCount}頭
                    </span>
                  </div>
                  <div className="ml-auto">
                    <ChevronDown className="h-4 w-4 -rotate-90 text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </PersistedAccordionItem>
      ))}
    </PersistedAccordion>
  );
}
