import { RaceDefinitionForm } from '@/features/admin/manage-race-definitions/ui/race-definition-form';
import { getVenues } from '@/features/admin/manage-venues/actions';
import { AdminBackLink, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { redirect } from 'next/navigation';

export default async function CreateRaceDefinitionPage() {
  const venues = await getVenues();

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
        <AdminPageHeader title="新規レース定義登録" description="新しいレース定義（マスタ）を作成します。" />
      </div>

      <Card className="p-6">
        <RaceDefinitionForm venues={venues} onSuccess={onSuccess} />
      </Card>
    </div>
  );
}
