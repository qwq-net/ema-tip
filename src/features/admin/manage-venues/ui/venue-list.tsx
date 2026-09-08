import { ConfirmDeleteButton } from '@/features/admin/shared/ui/confirm-delete-button';
import { DIRECTION_LABELS } from '@/shared/constants/race';
import { Badge, TableBody, TableEmptyRow, TableHead, TableRow, TableShell, Td, Th } from '@/shared/ui';
import { lookup } from '@/shared/utils/lookup';
import Link from 'next/link';
import { deleteVenue, getVenues } from '../actions';

// 回りのバッジ色。直線は色を持たず、下の既定色で出す
const DIRECTION_BADGE_CLASSES = {
  LEFT: 'bg-orange-50 text-orange-700 ring-orange-200',
  RIGHT: 'bg-green-50 text-green-700 ring-green-200',
} satisfies Record<string, string>;

// 地域のラベルとバッジ色。国内 2 区分以外はすべて海外として扱う
const AREA_LABELS = {
  EAST_JAPAN: '東日本',
  WEST_JAPAN: '西日本',
} satisfies Record<string, string>;

const AREA_BADGE_CLASSES = {
  EAST_JAPAN: 'bg-blue-50 text-blue-700 ring-blue-200',
  WEST_JAPAN: 'bg-red-50 text-red-700 ring-red-200',
} satisfies Record<string, string>;

export async function VenueList() {
  const venues = await getVenues();

  return (
    <TableShell className="min-w-[500px]">
      <TableHead>
        <Th>競馬場名</Th>
        <Th>コード</Th>
        <Th>略称</Th>
        <Th>回り</Th>
        <Th>地域</Th>
        <Th className="w-32 text-right">操作</Th>
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
              <Badge
                label={DIRECTION_LABELS[venue.defaultDirection] || venue.defaultDirection}
                className={
                  lookup(DIRECTION_BADGE_CLASSES, venue.defaultDirection) ?? 'bg-gray-50 text-gray-700 ring-gray-200'
                }
              />
            </Td>
            <Td>
              <Badge
                label={lookup(AREA_LABELS, venue.area) ?? '海外'}
                className={lookup(AREA_BADGE_CLASSES, venue.area) ?? 'bg-purple-50 text-purple-700 ring-purple-200'}
              />
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
