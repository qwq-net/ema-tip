import { getVenue } from '@/features/admin/manage-venues/actions';
import { VenueForm } from '@/features/admin/manage-venues/ui/venue-form';
import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { notFound } from 'next/navigation';

export default async function EditVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venue = await getVenue(id);
  if (!venue) notFound();

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Breadcrumbs items={[{ label: '競馬場管理', href: '/admin/venues' }, { label: venue.name }]} />
      </div>

      <div className="mb-8">
        <AdminPageHeader title="競馬場情報の編集" description="競馬場の情報を編集します。" />
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
