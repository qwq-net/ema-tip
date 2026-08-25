'use client';

import { PersistedAccordion } from '@/shared/ui/persisted-accordion';
import * as Accordion from '@radix-ui/react-accordion';
import { Calendar, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import Link from 'next/link';

interface EntryRaceAccordionProps {
  events: Array<{
    id: string;
    name: string;
    date: string;
    races: Array<{
      id: string;
      name: string;
      raceNumber: number | null;
      date: string;
      venue: {
        shortName: string;
      };
    }>;
  }>;
}

const STORAGE_KEY = 'entry-race-accordion-open-items_v2';

export function EntryRaceAccordion({ events }: EntryRaceAccordionProps) {
  return (
    <PersistedAccordion
      storageKey={STORAGE_KEY}
      allIds={events.map((e) => e.id)}
      emptyState={
        <div className="py-12 text-center text-gray-500">
          登録可能なレースがありません。先にレースを登録してください。
        </div>
      }
    >
      {events.map((event) => (
        <Accordion.Item key={event.id} value={event.id}>
          <Accordion.Header className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-base font-semibold hover:bg-gray-100">
            <Accordion.Trigger className="flex w-full items-center justify-between">
              <div className="flex items-center gap-4">
                <span>{event.name}</span>
                <span className="text-sm font-normal text-gray-500">{event.date}</span>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-400 transition-transform duration-300 ease-in-out data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
            <div className="divide-y divide-gray-100 border-t border-gray-100">
              {event.races.length === 0 ? (
                <div className="py-8 text-center text-gray-500">このイベントに登録可能なレースはありません</div>
              ) : (
                event.races.map((race) => (
                  <Link
                    key={race.id}
                    href={`/admin/entries/${race.id}`}
                    className="group flex items-center justify-between p-4 transition-all hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4 pl-8">
                      <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-primary flex items-center gap-2 font-semibold">
                          {race.raceNumber ? (
                            <span className="text-sm font-semibold tracking-tighter text-gray-400 uppercase">
                              {race.raceNumber}R
                            </span>
                          ) : null}
                          {race.name}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {race.venue?.shortName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 transition-colors group-hover:text-gray-600" />
                  </Link>
                ))
              )}
            </div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </PersistedAccordion>
  );
}
