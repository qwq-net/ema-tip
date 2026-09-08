import { ConfirmDeleteButton } from '@/features/admin/shared/ui/confirm-delete-button';
import { DIRECTION_LABELS, RACE_GRADE_LABELS, RACE_TYPE_LABELS } from '@/shared/constants/race';
import { Badge, TableBody, TableEmptyRow, TableHead, TableRow, TableShell, Td, Th } from '@/shared/ui';
import Link from 'next/link';
import { deleteRaceDefinition, getRaceDefinitions } from '../actions';

export async function RaceDefinitionList() {
  const definitions = await getRaceDefinitions();

  return (
    <TableShell>
      <TableHead>
        <Th>レース名</Th>
        <Th>種別</Th>
        <Th>格付け</Th>
        <Th>コース</Th>
        <Th>方向</Th>
        <Th className="text-right">操作</Th>
      </TableHead>
      <TableBody>
        {definitions.length === 0 && <TableEmptyRow colSpan={6}>登録されているレースマスタはありません</TableEmptyRow>}
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
              <Badge label={RACE_TYPE_LABELS[def.type]} />
            </Td>
            <Td>
              <Badge label={RACE_GRADE_LABELS[def.grade]} />
            </Td>
            <Td className="text-text-sub">
              {def.defaultVenue.shortName} / {def.defaultDistance}m / {def.defaultSurface}
            </Td>
            <Td className="text-text-sub">{DIRECTION_LABELS[def.defaultDirection]}</Td>
            <Td className="text-right">
              <div className="flex justify-end gap-2">
                <ConfirmDeleteButton
                  title="レースマスタの削除"
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
