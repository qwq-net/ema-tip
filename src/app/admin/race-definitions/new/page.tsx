import { RaceDefinitionForm } from '@/features/admin/manage-race-definitions/ui/race-definition-form';
import { getVenues } from '@/features/admin/manage-venues/actions';
import { AdminFormPage } from '@/features/admin/ui/admin-form-page';

export default async function CreateRaceDefinitionPage() {
  const venues = await getVenues();

  return (
    <AdminFormPage
      breadcrumbs={[{ label: 'レースマスタ管理', href: '/admin/race-definitions' }, { label: '新規レースマスタ登録' }]}
      title="新規レースマスタ登録"
      description="新しいレースマスタを作成します。"
    >
      <RaceDefinitionForm venues={venues} redirectTo="/admin/race-definitions" />
    </AdminFormPage>
  );
}
