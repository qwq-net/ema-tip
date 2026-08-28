'use client';

import { Badge, Button, TableBody, TableEmptyRow, TableHead, TableRow, TableShell, Td, Th } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import { Trophy } from 'lucide-react';
import Link from 'next/link';

interface Race {
  id: string;
  name: string;
  raceNumber: number | null;
}

interface Bet5Event {
  id: string;
  race1: Race;
  race2: Race;
  race3: Race;
  race4: Race;
  race5: Race;
}

interface Event {
  id: string;
  name: string;
  date: string;
  races: Race[];
  bet5Event: Bet5Event | null;
}

export function Bet5EventList({ events }: { events: Event[] }) {
  const getSelectedRacesText = (bet5Event: Bet5Event) => {
    const races = [bet5Event.race1, bet5Event.race2, bet5Event.race3, bet5Event.race4, bet5Event.race5];
    return races.map((r) => `${r.raceNumber}R`).join(' > ');
  };

  return (
    <TableShell>
      <TableHead>
        <Th>イベント名</Th>
        <Th>開催日</Th>
        <Th>ステータス</Th>
        <Th>対象レース構成</Th>
        <Th>登録レース数</Th>
        <Th className="w-48 text-right">操作</Th>
      </TableHead>
      <TableBody>
        {events.map((event) => {
          const raceCount = event.races.length;
          const isConfigured = !!event.bet5Event;
          const isReady = raceCount >= 5;

          return (
            <TableRow key={event.id}>
              <Td title={event.name} className="font-semibold text-gray-900">
                {event.name}
              </Td>
              <Td className="text-gray-500">{event.date}</Td>
              <Td>
                {isConfigured ? (
                  <Badge label="設定済み" className="border-blue-200 bg-blue-100 text-blue-700" />
                ) : isReady ? (
                  <Badge label="設定可能" className="border-green-200 bg-green-100 text-green-700" />
                ) : (
                  <Badge label="レース不足" variant="outline" className="text-gray-400" />
                )}
              </Td>
              <Td className="font-medium text-gray-600">
                {event.bet5Event ? (
                  <span className="font-mono">{getSelectedRacesText(event.bet5Event)}</span>
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <span className={cn('font-semibold', isReady ? 'text-green-600' : 'text-gray-500')}>{raceCount}</span>
                  <span className="text-gray-400">/ 5</span>
                </div>
              </Td>
              <Td className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {isReady ? (
                    <Button
                      size="sm"
                      asChild
                      variant={isConfigured ? 'outline' : 'primary'}
                      className={cn('gap-1 shadow-sm', !isConfigured && 'bg-indigo-600 text-white hover:bg-indigo-700')}
                    >
                      <Link href={`/admin/events/${event.id}/bet5`}>
                        <Trophy className="h-4 w-4" />
                        {isConfigured ? '管理' : '設定'}
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled className="gap-1 opacity-50">
                      <Trophy className="h-4 w-4" />
                      設定
                    </Button>
                  )}
                </div>
              </Td>
            </TableRow>
          );
        })}
        {events.length === 0 && <TableEmptyRow colSpan={6}>表示できるイベントがありません</TableEmptyRow>}
      </TableBody>
    </TableShell>
  );
}
