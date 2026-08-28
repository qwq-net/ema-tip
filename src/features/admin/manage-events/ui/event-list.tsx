'use client';

import { type EventStatus } from '@/shared/constants/status';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TableBody,
  TableEmptyRow,
  TableHead,
  TableRow,
  TableShell,
  Td,
  Th,
} from '@/shared/ui';
import { ChevronDown, Pause, Play, RefreshCw, Square, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useTransition } from 'react';
import { updateEventStatus } from '../actions';

type Event = {
  id: string;
  name: string;
  description: string | null;
  status: EventStatus;
  distributeAmount: number;
  date: string;
};

export function EventList({ events }: { events: Event[] }) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (eventId: string, newStatus: Event['status']) => {
    startTransition(async () => {
      await updateEventStatus(eventId, newStatus);
    });
  };

  return (
    <TableShell>
      <TableHead>
        <Th>イベント名</Th>
        <Th>開催日</Th>
        <Th>ステータス</Th>
        <Th>配布金額</Th>
        <Th className="w-48 text-right">操作</Th>
      </TableHead>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <Td title={event.name}>
              <Link
                prefetch={false}
                href={`/admin/events/${event.id}`}
                className="text-primary hover:text-primary/80 font-semibold transition-colors hover:underline"
              >
                {event.name}
              </Link>
            </Td>
            <Td className="text-gray-500">{event.date}</Td>
            <Td>
              <Badge label={event.status} variant="status" />
            </Td>
            <Td className="font-semibold text-gray-600">{event.distributeAmount.toLocaleString('ja-JP')} 円</Td>
            <Td className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button asChild size="sm" variant="outline" className="gap-1">
                  <Link href={`/admin/events/${event.id}/ranking`} title="ランキング管理">
                    <Trophy className="h-3.5 w-3.5" />
                    順位
                  </Link>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" disabled={isPending} className="gap-1">
                      変更
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {event.status === 'SCHEDULED' && (
                      <DropdownMenuItem variant="success" onClick={() => handleStatusChange(event.id, 'ACTIVE')}>
                        <Play className="h-4 w-4" />
                        開始
                      </DropdownMenuItem>
                    )}
                    {event.status === 'ACTIVE' && (
                      <>
                        <DropdownMenuItem variant="warning" onClick={() => handleStatusChange(event.id, 'SCHEDULED')}>
                          <Pause className="h-4 w-4" />
                          一時停止
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleStatusChange(event.id, 'COMPLETED')}
                        >
                          <Square className="h-4 w-4" />
                          終了
                        </DropdownMenuItem>
                      </>
                    )}
                    {event.status === 'COMPLETED' && (
                      <DropdownMenuItem onClick={() => handleStatusChange(event.id, 'ACTIVE')}>
                        <RefreshCw className="h-4 w-4" />
                        再開
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Td>
          </TableRow>
        ))}
        {events.length === 0 && <TableEmptyRow colSpan={5}>表示できるイベントがありません</TableEmptyRow>}
      </TableBody>
    </TableShell>
  );
}
