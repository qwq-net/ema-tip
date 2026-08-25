import { getRaceDefinitions } from '@/features/admin/manage-race-definitions/actions';
import { getEvents } from '@/features/admin/manage-races/actions';
import { RaceForm } from '@/features/admin/manage-races/ui/race-form';
import { getVenues } from '@/features/admin/manage-venues/actions';
import { Card } from '@/shared/ui';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function CreateRacePage() {
  const [events, raceDefinitions, venues] = await Promise.all([getEvents(), getRaceDefinitions(), getVenues()]);

  async function onSuccess() {
    'use server';
    redirect('/admin/races');
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/races"
          className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ChevronLeft size={16} />
          レース一覧へ戻る
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">新規レース登録</h1>
        <p className="mt-1 text-gray-500">新しいレースの基本情報を入力してください。</p>
      </div>

      <Card className="p-6">
        <RaceForm events={events} raceDefinitions={raceDefinitions} venues={venues} onSuccess={onSuccess} />
      </Card>
    </div>
  );
}
