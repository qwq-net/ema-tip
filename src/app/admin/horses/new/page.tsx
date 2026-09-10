import { getHorseTags } from '@/features/admin/manage-horse-tags/actions';
import { HorseForm } from '@/features/admin/manage-horses/ui/horse-form';
import { AdminFormPage } from '@/features/admin/ui/admin-form-page';

export default async function CreateHorsePage() {
  const tagOptions = await getHorseTags();

  return (
    <AdminFormPage
      breadcrumbs={[{ label: '馬マスタ管理', href: '/admin/horses' }, { label: '新規馬登録' }]}
      title="新規馬登録"
      description="新しい競走馬の情報を入力してください。"
    >
      <HorseForm tagOptions={tagOptions} redirectTo="/admin/horses" />
    </AdminFormPage>
  );
}
