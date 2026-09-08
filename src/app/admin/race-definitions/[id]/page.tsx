import { getRaceDefinition } from '@/features/admin/manage-race-definitions/actions';
import { RaceDefinitionForm } from '@/features/admin/manage-race-definitions/ui/race-definition-form';
import { getVenues } from '@/features/admin/manage-venues/actions';
import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { notFound } from 'next/navigation';

export default async function EditRaceDefinitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [raceDefinition, venues] = await Promise.all([getRaceDefinition(id), getVenues()]);
  if (!raceDefinition) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumbs
        items={[{ label: 'レースマスタ管理', href: '/admin/race-definitions' }, { label: raceDefinition.name }]}
      />

      <AdminPageHeader title="レースマスタの編集" description="レースマスタの内容を編集します。" />

      <Card className="p-6">
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
      </Card>
    </div>
  );
}
