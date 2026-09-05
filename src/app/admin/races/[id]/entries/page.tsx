import { EntryDnd, getAvailableHorses, getEntriesForRace, getRaceById } from '@/features/admin/manage-entries';
import { Card } from '@/shared/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: '出走馬',
};

export default async function RaceEntriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const race = await getRaceById(id);
  if (!race) {
    notFound();
  }

  // saveEntries は受付中以外を拒否するため、操作できない状態では編集 UI を出さない
  if (race.status !== 'SCHEDULED') {
    return (
      <Card className="p-6 text-sm text-gray-500">
        受付終了後は出走馬を変更できません。変更が必要な場合は受付を再開してください。
      </Card>
    );
  }

  const [availableHorses, existingEntries] = await Promise.all([getAvailableHorses(id), getEntriesForRace(id)]);

  return (
    <Card className="p-6">
      <EntryDnd raceId={id} availableHorses={availableHorses} existingEntries={existingEntries} />
    </Card>
  );
}
