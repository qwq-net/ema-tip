import { VenueForm } from '@/features/admin/manage-venues/ui/venue-form';
import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';

export default function CreateVenuePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumbs items={[{ label: '競馬場管理', href: '/admin/venues' }, { label: '新規競馬場登録' }]} />

      <AdminPageHeader title="新規競馬場登録" description="新しい競馬場を登録します。" />

      <Card className="p-6">
        <VenueForm redirectTo="/admin/venues" />
      </Card>
    </div>
  );
}
