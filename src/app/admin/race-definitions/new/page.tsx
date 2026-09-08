import { RaceDefinitionForm } from '@/features/admin/manage-race-definitions/ui/race-definition-form';
import { getVenues } from '@/features/admin/manage-venues/actions';
import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';

export default async function CreateRaceDefinitionPage() {
  const venues = await getVenues();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumbs
        items={[{ label: 'レースマスタ管理', href: '/admin/race-definitions' }, { label: '新規レースマスタ登録' }]}
      />

      <AdminPageHeader title="新規レースマスタ登録" description="新しいレースマスタを作成します。" />

      <Card className="p-6">
        <RaceDefinitionForm venues={venues} redirectTo="/admin/race-definitions" />
      </Card>
    </div>
  );
}
