import { getRaceDefinition } from '@/features/admin/manage-race-definitions/actions';
import { RaceDefinitionForm } from '@/features/admin/manage-race-definitions/ui/race-definition-form';
import { getVenues } from '@/features/admin/manage-venues/actions';
import { AdminFormPage } from '@/features/admin/ui/admin-form-page';
import { notFound } from 'next/navigation';

export default async function EditRaceDefinitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [raceDefinition, venues] = await Promise.all([getRaceDefinition(id), getVenues()]);
  if (!raceDefinition) {
    notFound();
  }

  return (
    <AdminFormPage
      breadcrumbs={[{ label: 'レースマスタ管理', href: '/admin/race-definitions' }, { label: raceDefinition.name }]}
      title="レースマスタの編集"
      description="レースマスタの内容を編集します。"
    >
      <RaceDefinitionForm
        key={JSON.stringify(raceDefinition)}
        initialData={{
          ...raceDefinition,
          defaultVenueId: raceDefinition.defaultVenueId,
          defaultSurface: raceDefinition.defaultSurface,
        }}
        venues={venues}
        redirectTo="/admin/race-definitions"
      />
    </AdminFormPage>
  );
}
