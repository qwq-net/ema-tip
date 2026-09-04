import { ConfirmDeleteButton } from '@/features/admin/shared/ui/confirm-delete-button';
import { Badge, TableBody, TableEmptyRow, TableHead, TableRow, TableShell, Td, Th } from '@/shared/ui';
import Link from 'next/link';
import { deleteRaceDefinition, getRaceDefinitions } from '../actions';

const GRADE_LABELS = {
  G1: 'G1',
  G2: 'G2',
  G3: 'G3',
  L: 'L',
  OP: 'OP',
  '3_WIN': '3勝',
  '2_WIN': '2勝',
  '1_WIN': '1勝',
  MAIDEN: '未',
  NEWCOMER: '新',
} satisfies Record<string, string>;

const DIRECTION_LABELS = {
  LEFT: '左',
  RIGHT: '右',
  STRAIGHT: '直',
} satisfies Record<string, string>;

export async function RaceDefinitionList() {
  const definitions = await getRaceDefinitions();

  return (
    <TableShell>
      <TableHead>
        <Th>レース名</Th>
        <Th>種別</Th>
        <Th>格付け</Th>
        <Th>コース詳細 (場所 / 距離 / 馬場)</Th>
        <Th>方向</Th>
        <Th className="w-32 text-right">操作</Th>
      </TableHead>
      <TableBody>
        {definitions.length === 0 && <TableEmptyRow colSpan={6}>登録されているレース定義はありません</TableEmptyRow>}
        {definitions.map((def) => (
          <TableRow key={def.id}>
            <Td className="font-semibold">
              <Link
                href={`/admin/race-definitions/${def.id}`}
                className="text-primary hover:text-primary/80 transition-colors hover:underline"
              >
                {def.name}
              </Link>
            </Td>
            <Td>
              <Badge
                label={def.type === 'REAL' ? '実在' : '架空'}
                className={
                  def.type === 'REAL'
                    ? 'bg-green-50 text-green-700 ring-green-200'
                    : 'bg-purple-50 text-purple-700 ring-purple-200'
                }
              />
            </Td>
            <Td>
              <Badge
                label={GRADE_LABELS[def.grade] || def.grade}
                className={
                  def.grade.startsWith('G')
                    ? 'bg-amber-50 text-amber-800 ring-amber-200'
                    : 'bg-gray-50 text-gray-600 ring-gray-200'
                }
              />
            </Td>
            <Td className="text-gray-600">
              {def.defaultVenue.shortName} / {def.defaultDistance}m / {def.defaultSurface}
            </Td>
            <Td className="text-gray-600">{DIRECTION_LABELS[def.defaultDirection] || def.defaultDirection}</Td>
            <Td className="text-right">
              <div className="flex justify-end gap-2">
                <ConfirmDeleteButton
                  title="レース定義の削除"
                  itemName={def.name}
                  onDelete={deleteRaceDefinition.bind(null, def.id)}
                />
              </div>
            </Td>
          </TableRow>
        ))}
      </TableBody>
    </TableShell>
  );
}
