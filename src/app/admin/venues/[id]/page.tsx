import { getVenue } from '@/features/admin/manage-venues/actions';
import { VenueForm } from '@/features/admin/manage-venues/ui/venue-form';
import { AdminBackLink, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { notFound } from 'next/navigation';

export default async function EditVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venue = await getVenue(id);
  if (!venue) notFound();

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
          key={JSON.stringify(venue)}
          initialData={{
            ...venue,
            direction: venue.defaultDirection,
            area: venue.area,
          }}
          redirectTo="/admin/venues"
        />
      </Card>
    </div>
  );
}
