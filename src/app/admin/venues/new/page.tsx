import { VenueForm } from '@/features/admin/manage-venues/ui/venue-form';
import { AdminFormPage } from '@/features/admin/ui/admin-form-page';

export default function CreateVenuePage() {
  return (
    <AdminFormPage
      breadcrumbs={[{ label: '競馬場管理', href: '/admin/venues' }, { label: '新規競馬場登録' }]}
      title="新規競馬場登録"
      description="新しい競馬場を登録します。"
    >
      <VenueForm redirectTo="/admin/venues" />
    </AdminFormPage>
  );
}
