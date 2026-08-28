import { TableBody, TableHead, TableRow, Td, Th } from '@/shared/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface RaceListTableRace {
  id: string;
  name: string;
  raceNumber: number | null;
  distance: number;
  surface: string;
  condition?: string | null;
  venue?: { name?: string; shortName?: string } | null;
}

interface RaceListTableProps<T extends RaceListTableRace> {
  races: T[];
  /** レース名リンクの遷移先。 */
  hrefFor: (race: T) => string;
  /** レース名の右に添える要素。外部リンク等。 */
  nameExtra?: (race: T) => ReactNode;
  /** 末尾列。ページ目的に応じて状態バッジや頭数を渡す。省略時は列ごと描画しない。 */
  tail?: { header: string; cell: (race: T) => ReactNode };
  /** races が空のときにテーブルの代わりに表示する文言。 */
  emptyMessage: string;
}

/**
 * アコーディオン内側に置くレース一覧テーブルの標準形。
 * 番号・レース名・場所・距離・馬場の列を固定し、遷移先と末尾列だけを差し替える。
 * 枠は持たないため PersistedAccordionItem 等の枠内で使うこと。
 */
export function RaceListTable<T extends RaceListTableRace>({
  races,
  hrefFor,
  nameExtra,
  tail,
  emptyMessage,
}: RaceListTableProps<T>) {
  if (races.length === 0) {
    return <div className="py-8 text-center text-gray-500">{emptyMessage}</div>;
  }

  return (
    <table className="w-full min-w-[800px] border-collapse">
      <TableHead>
        <Th>番号</Th>
        <Th>レース名</Th>
        <Th>場所</Th>
        <Th>距離</Th>
        <Th>馬場</Th>
        {tail && <Th>{tail.header}</Th>}
      </TableHead>
      <TableBody>
        {races.map((race) => (
          <TableRow key={race.id}>
            <Td className="font-medium text-gray-900">{race.raceNumber ? `${race.raceNumber}R` : '-'}</Td>
            <Td>
              <div className="flex items-center gap-2">
                <Link
                  href={hrefFor(race)}
                  className="text-primary hover:text-primary/80 font-semibold transition-colors hover:underline"
                >
                  {race.name}
                </Link>
                {nameExtra?.(race)}
              </div>
            </Td>
            <Td className="text-gray-500">{race.venue?.name ?? race.venue?.shortName ?? '-'}</Td>
            <Td className="text-gray-500">{race.distance}m</Td>
            <Td className="text-gray-500">
              {race.surface} {race.condition || ''}
            </Td>
            {tail && <Td>{tail.cell(race)}</Td>}
          </TableRow>
        ))}
      </TableBody>
    </table>
  );
}
