import { getEvent } from '@/features/admin/manage-events/actions';
import { AdminEventEditor } from '@/features/admin/manage-events/ui/admin-event-editor';
import { AdminBackLink, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { notFound } from 'next/navigation';

export default async function EventEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <AdminBackLink href="/admin/events" />
      </div>

      <div className="mb-8">
        <AdminPageHeader title="イベント情報の編集" description={`${event.name} の設定を変更します`} />
      </div>

      <Card className="p-6">
        <AdminEventEditor event={event} />
      </Card>
    </div>
  );
}
