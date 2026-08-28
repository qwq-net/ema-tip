import { getVenue } from '@/features/admin/manage-venues/actions';
import { VenueForm } from '@/features/admin/manage-venues/ui/venue-form';
import { AdminBackLink, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { redirect } from 'next/navigation';

export default async function EditVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venue = await getVenue(id);

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
        <AdminPageHeader title="会場情報の編集" description="会場情報を編集します。" />
      </div>

      <Card className="p-6">
        <VenueForm
          initialData={{
            ...venue,
            code: venue.code || undefined,
            direction: venue.defaultDirection as 'LEFT' | 'RIGHT' | 'STRAIGHT',
            area: venue.area as 'EAST_JAPAN' | 'WEST_JAPAN' | 'OVERSEAS',
          }}
          onSuccess={onSuccess}
        />
      </Card>
    </div>
  );
}
