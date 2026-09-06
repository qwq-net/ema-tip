'use client';

import { EventForm } from '@/features/admin/manage-events/ui/event-form';
import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { useRouter } from 'next/navigation';

export default function CreateEventPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/admin/events');
  };

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Breadcrumbs items={[{ label: 'イベント管理', href: '/admin/events' }, { label: '新規イベント作成' }]} />
      </div>

      <div className="mb-8">
        <AdminPageHeader title="新規イベント作成" description="新しいイベントの基本情報を入力してください" />
      </div>

      <Card className="p-6">
        <EventForm onSuccess={handleSuccess} />
      </Card>
    </div>
  );
}
