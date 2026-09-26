import { ConfirmDeleteButton } from '@/features/admin/shared/ui/confirm-delete-button';
import { type EventStatus } from '@/shared/constants/status';
import { Badge, TableBody, TableEmptyRow, TableHead, TableRow, TableShell, Td, Th } from '@/shared/ui';
import Link from 'next/link';
import { deleteEvent } from '../delete';

interface Event {
  id: string;
  name: string;
  status: EventStatus;
  distributeAmount: number;
  date: string;
}

/** イベント一覧。削除は確認ダイアログを経由し、購入済みならサーバー側で拒否する。 */
export function EventList({ events }: { events: Event[] }) {
  return (
    <TableShell>
      <TableHead>
        <Th>イベント名</Th>
        <Th>開催日</Th>
        <Th>ステータス</Th>
        <Th>配布金額</Th>
        <Th>操作</Th>
      </TableHead>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <Td title={event.name} className="whitespace-normal">
              <Link
                prefetch={false}
                href={`/admin/events/${event.id}`}
                className="text-primary hover:text-primary/80 font-semibold transition-colors hover:underline"
              >
                {event.name}
              </Link>
            </Td>
            <Td className="text-text-sub">{event.date}</Td>
            <Td>
              <Badge label={event.status} variant="status" />
            </Td>
            <Td className="font-semibold text-gray-600">{event.distributeAmount.toLocaleString('ja-JP')} 円</Td>
            <Td>
              <ConfirmDeleteButton
                title="イベントの削除"
                itemName={event.name}
                onDelete={deleteEvent.bind(null, event.id)}
                description={`「${event.name}」とレース、参加者の配布残高・取引履歴を削除します。馬券またはBET5の購入がある場合は削除できません。`}
              />
            </Td>
          </TableRow>
        ))}
        {events.length === 0 && <TableEmptyRow colSpan={5}>イベントがありません</TableEmptyRow>}
      </TableBody>
    </TableShell>
  );
}
