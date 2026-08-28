import { getHorseTags } from '@/features/admin/manage-horse-tags/actions';
import { getHorse } from '@/features/admin/manage-horses/actions';
import { HorseForm } from '@/features/admin/manage-horses/ui/horse-form';
import { AdminBackLink, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Card } from '@/shared/ui';
import { redirect } from 'next/navigation';

export default async function EditHorsePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [horse, tagOptions] = await Promise.all([getHorse(id), getHorseTags()]);

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
        <AdminPageHeader title="馬情報の編集" description="馬情報を編集します。" />
      </div>

      <Card className="p-6">
        <HorseForm
          initialData={{
            ...horse,
            gender: horse.gender as '牡' | '牝' | 'セン',
            origin: horse.origin as 'DOMESTIC' | 'FOREIGN_BRED' | 'FOREIGN_TRAINED',
            type: horse.type as 'REAL' | 'FICTIONAL',
            tags: horse.tags,
          }}
          tagOptions={tagOptions}
          onSuccess={onSuccess}
        />
      </Card>
    </div>
  );
}
