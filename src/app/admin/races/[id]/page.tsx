import { getRaceDetailData } from '@/features/admin/manage-races/queries/race-detail';
import { RaceDetail } from '@/features/admin/manage-races/ui/race-detail';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'レース詳細編集',
};

export default async function RaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRaceDetailData(id);
  if (!data) {
    notFound();
  }

  return <RaceDetail {...data} />;
}
