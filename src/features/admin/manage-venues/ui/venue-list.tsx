import { ConfirmDeleteButton } from '@/features/admin/shared/ui/confirm-delete-button';
import { DIRECTION_LABELS } from '@/shared/constants/race';
import { Badge, TableBody, TableEmptyRow, TableHead, TableRow, TableShell, Td, Th } from '@/shared/ui';
import Link from 'next/link';
import { deleteVenue, getVenues } from '../actions';

export async function VenueList() {
  const venues = await getVenues();

  return (
    <TableShell className="min-w-[500px]">
      <TableHead>
        <Th>会場名</Th>
        <Th>コード</Th>
        <Th>略称</Th>
        <Th>回り</Th>
        <Th>地域</Th>
        <Th className="w-32 text-right">操作</Th>
      </TableHead>
      <TableBody>
        {venues.length === 0 && <TableEmptyRow colSpan={6}>登録されている会場はありません</TableEmptyRow>}
        {venues.map((venue) => (
          <TableRow key={venue.id}>
            <Td className="font-semibold text-gray-900">
              <Link
                href={`/admin/venues/${venue.id}`}
                className="text-primary hover:text-primary/80 transition-colors hover:underline"
              >
                {venue.name}
              </Link>
            </Td>
            <Td className="font-mono text-gray-500">{venue.code || '-'}</Td>
            <Td>{venue.shortName}</Td>
            <Td>
              <Badge
                label={DIRECTION_LABELS[venue.defaultDirection] || venue.defaultDirection}
                className={
                  venue.defaultDirection === 'LEFT'
                    ? 'bg-orange-50 text-orange-700 ring-orange-200'
                    : venue.defaultDirection === 'RIGHT'
                      ? 'bg-green-50 text-green-700 ring-green-200'
                      : 'bg-gray-50 text-gray-700 ring-gray-200'
                }
              />
            </Td>
            <Td>
              <Badge
                label={venue.area === 'EAST_JAPAN' ? '東日本' : venue.area === 'WEST_JAPAN' ? '西日本' : '海外'}
                className={
                  venue.area === 'EAST_JAPAN'
                    ? 'bg-blue-50 text-blue-700 ring-blue-200'
                    : venue.area === 'WEST_JAPAN'
                      ? 'bg-red-50 text-red-700 ring-red-200'
                      : 'bg-purple-50 text-purple-700 ring-purple-200'
                }
              />
            </Td>
            <Td className="text-right">
              <div className="flex justify-end">
                <ConfirmDeleteButton
                  title="会場の削除"
                  itemName={venue.name}
                  onDelete={deleteVenue.bind(null, venue.id)}
                />
              </div>
            </Td>
          </TableRow>
        ))}
      </TableBody>
    </TableShell>
  );
}
