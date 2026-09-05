import { type EventStatus } from '@/shared/constants/status';
import { Badge, TableBody, TableEmptyRow, TableHead, TableRow, TableShell, Td, Th } from '@/shared/ui';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  status: EventStatus;
  distributeAmount: number;
  date: string;
}

/** イベント一覧。操作はイベント詳細のタブに集約しているため、行はイベント名のリンクだけを持つ。 */
export function EventList({ events }: { events: Event[] }) {
  return (
    <TableShell>
      <TableHead>
        <Th>イベント名</Th>
        <Th>開催日</Th>
        <Th>ステータス</Th>
        <Th>配布金額</Th>
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
          </TableRow>
        ))}
        {events.length === 0 && <TableEmptyRow colSpan={4}>イベントがありません</TableEmptyRow>}
      </TableBody>
    </TableShell>
  );
}
