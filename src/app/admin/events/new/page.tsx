'use client';

import { EventForm } from '@/features/admin/manage-events/ui/event-form';
import { AdminFormPage } from '@/features/admin/ui/admin-form-page';
import { useRouter } from 'next/navigation';

export default function CreateEventPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/admin/events');
  };

  return (
    <AdminFormPage
      breadcrumbs={[{ label: 'イベント管理', href: '/admin/events' }, { label: '新規イベント作成' }]}
      title="新規イベント作成"
      description="新しいイベントの基本情報を入力してください"
    >
      <EventForm onSuccess={handleSuccess} />
    </AdminFormPage>
  );
}
