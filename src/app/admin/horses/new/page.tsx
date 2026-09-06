import { getHorseTags } from '@/features/admin/manage-horse-tags/actions';
import { HorseForm } from '@/features/admin/manage-horses/ui/horse-form';
import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';

export default async function CreateHorsePage() {
  const tagOptions = await getHorseTags();

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Breadcrumbs items={[{ label: '馬マスタ管理', href: '/admin/horses' }, { label: '新規馬登録' }]} />
      </div>

      <div className="mb-8">
        <AdminPageHeader title="新規馬登録" description="新しい競走馬の情報を入力してください。" />
      </div>

      <Card className="p-6">
        <HorseForm tagOptions={tagOptions} redirectTo="/admin/horses" />
      </Card>
    </div>
  );
}
