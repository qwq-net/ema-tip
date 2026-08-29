import { ConfirmDeleteButton } from '@/features/admin/shared/ui/confirm-delete-button';
import { Badge, TableBody, TableEmptyRow, TableHead, TableRow, TableShell, Td, Th } from '@/shared/ui';
import { getGenderAge } from '@/shared/utils/gender';
import Link from 'next/link';
import { deleteHorse, getHorses } from '../actions';

export async function HorseList() {
  const horses = await getHorses();

  const originLabels = {
    DOMESTIC: '日本産',
    FOREIGN_BRED: '外国産',
    FOREIGN_TRAINED: '外来馬',
  } satisfies Record<string, string>;

  return (
    <TableShell className="min-w-[700px]">
      <TableHead>
        <Th>馬名/種別</Th>
        <Th>タグ</Th>
        <Th>産地</Th>
        <Th>性齢</Th>
        <Th>備考</Th>
        <Th className="w-32 text-right">操作</Th>
      </TableHead>
      <TableBody>
        {horses.length === 0 && <TableEmptyRow colSpan={6}>登録されている馬はありません</TableEmptyRow>}
        {horses.map((horse) => (
          <TableRow key={horse.id}>
            <Td className="font-semibold text-gray-900">
              <div className="flex items-center gap-2">
                <Badge
                  label={horse.type === 'REAL' ? '実在' : '架空'}
                  className={
                    horse.type === 'REAL'
                      ? 'bg-green-50 text-green-700 ring-green-200'
                      : 'bg-purple-50 text-purple-700 ring-purple-200'
                  }
                />
                <Link
                  href={`/admin/horses/${horse.id}`}
                  className="text-primary hover:text-primary/80 transition-colors hover:underline"
                >
                  {horse.name}
                </Link>
              </div>
            </Td>
            <Td>
              <div className="flex max-w-[200px] flex-wrap gap-1">
                {horse.tags.length > 0 ? (
                  horse.tags.map((tag) => (
                    <Badge key={tag.id} label={tag.content} className="bg-gray-100 text-gray-600" />
                  ))
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </div>
            </Td>
            <Td>
              <Badge label={originLabels[horse.origin] || '不明'} variant="origin" />
            </Td>
            <Td>
              <Badge label={getGenderAge(horse.gender, horse.age)} variant="gender" />
            </Td>
            <Td className="max-w-[200px] truncate font-medium text-gray-500" title={horse.notes || ''}>
              {horse.notes || '-'}
            </Td>
            <Td className="text-right">
              <div className="flex justify-end gap-2">
                <ConfirmDeleteButton
                  title="馬の削除"
                  itemName={horse.name}
                  onDelete={deleteHorse.bind(null, horse.id)}
                />
              </div>
            </Td>
          </TableRow>
        ))}
      </TableBody>
    </TableShell>
  );
}
