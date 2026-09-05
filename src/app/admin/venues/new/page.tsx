import { VenueForm } from '@/features/admin/manage-venues/ui/venue-form';
import { AdminBackLink, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';

export default function CreateVenuePage() {
  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <AdminBackLink href="/admin/venues" />
      </div>

      <div className="mb-8">
        <AdminPageHeader title="新規会場登録" description="新しい開催会場を登録します。" />
      </div>

      <Card className="p-6">
        <VenueForm redirectTo="/admin/venues" />
      </Card>
    </div>
  );
}
