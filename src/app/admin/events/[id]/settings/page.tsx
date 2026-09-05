import { getEvent } from '@/features/admin/manage-events/actions';
import { AdminEventEditor } from '@/features/admin/manage-events/ui/admin-event-editor';
import { Card } from '@/shared/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'イベント設定',
};

export default async function EventSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) {
    notFound();
  }

  return (
    <Card className="max-w-2xl p-6">
      <AdminEventEditor event={event} />
    </Card>
  );
}
