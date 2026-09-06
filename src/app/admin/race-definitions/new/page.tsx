import { RaceDefinitionForm } from '@/features/admin/manage-race-definitions/ui/race-definition-form';
import { getVenues } from '@/features/admin/manage-venues/actions';
import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';

export default async function CreateRaceDefinitionPage() {
  const venues = await getVenues();

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Breadcrumbs
          items={[{ label: 'レースマスタ管理', href: '/admin/race-definitions' }, { label: '新規レース定義登録' }]}
        />
      </div>

      <div className="mb-8">
        <AdminPageHeader title="新規レース定義登録" description="新しいレース定義（マスタ）を作成します。" />
      </div>

      <Card className="p-6">
        <RaceDefinitionForm venues={venues} redirectTo="/admin/race-definitions" />
      </Card>
    </div>
  );
}
