import { RaceGuaranteedOddsForm } from '@/features/admin/manage-races/ui/race-guaranteed-odds-form';
import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { db } from '@/shared/db';
import { raceInstances } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import { ChevronLeft } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: '保証オッズ設定',
};

export default async function RaceOddsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const race = await db.query.raceInstances.findFirst({
    where: eq(raceInstances.id, id),
    columns: {
      id: true,
      name: true,
      guaranteedOdds: true,
    },
  });

  if (!race) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/races/${id}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <AdminPageHeader title={`${race.name} - 保証オッズ設定`} />
      </div>

      <RaceGuaranteedOddsForm raceId={race.id} initialOdds={race.guaranteedOdds ?? {}} />
    </div>
  );
}
