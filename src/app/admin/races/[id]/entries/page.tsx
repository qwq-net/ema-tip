import {
  EntryDnd,
  getAvailableHorses,
  getEntriesForRace,
  getRaceById,
  hasBetsForRace,
} from '@/features/admin/manage-entries';
import { Card } from '@/shared/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: '出走馬',
};

/** 出走馬を編集できない理由の文言を返す。編集できるレースなら null。受付状態を先に見て、受付中なら馬券の有無を確認する */
async function resolveLockedReason(status: string, raceId: string): Promise<string | null> {
  if (status !== 'SCHEDULED') {
    return '受付終了後は出走馬を変更できません。変更が必要な場合は受付を再開してください。';
  }
  if (await hasBetsForRace(raceId)) {
    return '馬券が購入済みのため出走馬を変更できません。';
  }
  return null;
}

export default async function RaceEntriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const race = await getRaceById(id);
  if (!race) {
    notFound();
  }

  // saveEntries が拒否する状態では編集 UI を出さず、理由だけを示す
  const lockedReason = await resolveLockedReason(race.status, id);
  if (lockedReason) {
    return <Card className="p-6 text-sm text-gray-500">{lockedReason}</Card>;
  }

  const [availableHorses, existingEntries] = await Promise.all([getAvailableHorses(id), getEntriesForRace(id)]);

  return (
    <Card className="p-6">
      <EntryDnd raceId={id} availableHorses={availableHorses} existingEntries={existingEntries} />
    </Card>
  );
}
