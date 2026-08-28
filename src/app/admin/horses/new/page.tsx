import { getHorseTags } from '@/features/admin/manage-horse-tags/actions';
import { HorseForm } from '@/features/admin/manage-horses/ui/horse-form';
import { AdminBackLink, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { redirect } from 'next/navigation';

export default async function CreateHorsePage() {
  const tagOptions = await getHorseTags();

  async function onSuccess() {
    'use server';
    redirect('/admin/horses');
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <AdminBackLink href="/admin/horses" />
      </div>

      <div className="mb-8">
        <AdminPageHeader title="新規馬登録" description="新しい競走馬の情報を入力してください。" />
      </div>

      <Card className="p-6">
        <HorseForm tagOptions={tagOptions} onSuccess={onSuccess} />
      </Card>
    </div>
  );
}
