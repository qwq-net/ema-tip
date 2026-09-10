import { getVenue } from '@/features/admin/manage-venues/actions';
import { VenueForm } from '@/features/admin/manage-venues/ui/venue-form';
import { AdminFormPage } from '@/features/admin/ui/admin-form-page';
import { notFound } from 'next/navigation';

export default async function EditVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venue = await getVenue(id);
  if (!venue) notFound();

  return (
    <AdminFormPage
      breadcrumbs={[{ label: '競馬場管理', href: '/admin/venues' }, { label: venue.name }]}
      title="競馬場情報の編集"
      description="競馬場の情報を編集します。"
    >
      <VenueForm
        key={JSON.stringify(venue)}
        initialData={{
          ...venue,
          direction: venue.defaultDirection,
          area: venue.area,
        }}
        redirectTo="/admin/venues"
      />
    </AdminFormPage>
  );
}
