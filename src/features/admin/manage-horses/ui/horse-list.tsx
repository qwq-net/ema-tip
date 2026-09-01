'use client';

import { filterHorses, type SourceFilter } from '@/features/admin/shared/lib/filter-horses';
import { ConfirmDeleteButton } from '@/features/admin/shared/ui/confirm-delete-button';
import { Badge, Input, TableBody, TableEmptyRow, TableHead, TableRow, TableShell, Td, Th } from '@/shared/ui';
import { getGenderAge } from '@/shared/utils/gender';
import clsx from 'clsx';
import Link from 'next/link';
import { useState } from 'react';
import { deleteHorse, type getHorses } from '../actions';

type Horse = Awaited<ReturnType<typeof getHorses>>[number];

const originLabels = {
  DOMESTIC: '日本産',
  FOREIGN_BRED: '外国産',
  FOREIGN_TRAINED: '外来馬',
} satisfies Record<string, string>;

const sourceFilterOptions = [
  { value: 'ALL', label: '全て' },
  { value: 'MANUAL', label: '手動登録' },
  { value: 'NETKEIBA', label: 'Netkeiba経由' },
] satisfies { value: SourceFilter; label: string }[];

export function HorseList({ horses }: { horses: Horse[] }) {
  const [searchWord, setSearchWord] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');

  const filteredHorses = filterHorses(horses, searchWord, sourceFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
          {sourceFilterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSourceFilter(option.value)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                sourceFilter === option.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Input
          type="search"
          value={searchWord}
          onChange={(e) => setSearchWord(e.target.value)}
          placeholder="馬名で検索"
          className="w-64"
        />
      </div>

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
          {horses.length > 0 && filteredHorses.length === 0 && (
            <TableEmptyRow colSpan={6}>該当する馬がいません</TableEmptyRow>
          )}
          {filteredHorses.map((horse) => (
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
    </div>
  );
}
