import { getRaceDefinition } from '@/features/admin/manage-race-definitions/actions';
import { RaceDefinitionForm } from '@/features/admin/manage-race-definitions/ui/race-definition-form';
import { getVenues } from '@/features/admin/manage-venues/actions';
import { AdminBackLink, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { redirect } from 'next/navigation';

export default async function EditRaceDefinitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [raceDefinition, venues] = await Promise.all([getRaceDefinition(id), getVenues()]);

  async function onSuccess() {
    'use server';
    redirect('/admin/race-definitions');
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <AdminBackLink href="/admin/race-definitions" />
      </div>

      <div className="mb-8">
        <AdminPageHeader title="レース定義の編集" description="レース定義（マスタ）の内容を編集します。" />
      </div>

      <Card className="p-6">
        <RaceDefinitionForm
          initialData={{
            ...raceDefinition,
            code: raceDefinition.code || undefined,
            defaultVenueId: raceDefinition.defaultVenueId,
            defaultSurface: raceDefinition.defaultSurface,
          }}
          venues={venues}
          onSuccess={onSuccess}
        />
      </Card>
    </div>
  );
}
