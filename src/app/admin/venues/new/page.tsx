import { VenueForm } from '@/features/admin/manage-venues/ui/venue-form';
import { AdminBackLink, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { redirect } from 'next/navigation';

export default function CreateVenuePage() {
  async function onSuccess() {
    'use server';
    redirect('/admin/venues');
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <AdminBackLink href="/admin/venues" />
      </div>

      <div className="mb-8">
        <AdminPageHeader title="新規会場登録" description="新しい開催会場を登録します。" />
      </div>

      <Card className="p-6">
        <VenueForm onSuccess={onSuccess} />
      </Card>
    </div>
  );
}
