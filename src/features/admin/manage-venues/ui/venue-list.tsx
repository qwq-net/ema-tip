import { ConfirmDeleteButton } from '@/features/admin/shared/ui/confirm-delete-button';
import { DIRECTION_LABELS, type VENUE_AREAS } from '@/shared/constants/race';
import { Badge, TableBody, TableEmptyRow, TableHead, TableRow, TableShell, Td, Th } from '@/shared/ui';
import Link from 'next/link';
import { deleteVenue, getVenues } from '../actions';

// 地域の表示名。国内 2 区分と海外の 3 分類を網羅します。
const AREA_LABELS = {
  EAST_JAPAN: '東日本',
  WEST_JAPAN: '西日本',
  OVERSEAS: '海外',
} satisfies Record<(typeof VENUE_AREAS)[number], string>;

export async function VenueList() {
  const venues = await getVenues();

  return (
    <TableShell>
      <TableHead>
        <Th>競馬場名</Th>
        <Th>コード</Th>
        <Th>略称</Th>
        <Th>回り</Th>
        <Th>地域</Th>
        <Th className="text-right">操作</Th>
      </TableHead>
      <TableBody>
        {venues.length === 0 && <TableEmptyRow colSpan={6}>登録されている競馬場はありません</TableEmptyRow>}
        {venues.map((venue) => (
          <TableRow key={venue.id}>
            <Td className="text-text-main font-semibold">
              <Link
                href={`/admin/venues/${venue.id}`}
                className="text-primary hover:text-primary/80 transition-colors hover:underline"
              >
                {venue.name}
              </Link>
            </Td>
            <Td className="text-text-sub font-mono">{venue.code || '-'}</Td>
            <Td>{venue.shortName}</Td>
            <Td>
              <Badge label={DIRECTION_LABELS[venue.defaultDirection]} />
            </Td>
            <Td>
              <Badge label={AREA_LABELS[venue.area]} />
            </Td>
            <Td className="text-right">
              <div className="flex justify-end">
                <ConfirmDeleteButton
                  title="競馬場の削除"
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
