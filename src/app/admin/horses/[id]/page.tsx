import { getHorseTags } from '@/features/admin/manage-horse-tags/actions';
import { getHorse } from '@/features/admin/manage-horses/actions';
import { HorseForm } from '@/features/admin/manage-horses/ui/horse-form';
import { AdminFormPage } from '@/features/admin/ui/admin-form-page';
import { notFound } from 'next/navigation';

// DB は英語 enum、フォームは日本語表記のため編集初期値をここで変換する
const GENDER_TO_FORM = {
  HORSE: '牡',
  COLT: '牡',
  MARE: '牝',
  FILLY: '牝',
  GELDING: 'セン',
} satisfies Record<string, '牡' | '牝' | 'セン'>;

export default async function EditHorsePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [horse, tagOptions] = await Promise.all([getHorse(id), getHorseTags()]);
  if (!horse) {
    notFound();
  }

  return (
    <AdminFormPage
      breadcrumbs={[{ label: '馬マスタ管理', href: '/admin/horses' }, { label: horse.name }]}
      title="馬情報の編集"
      description="馬情報を編集します。"
    >
      <HorseForm
        key={horse.updatedAt.toISOString()}
        initialData={{
          ...horse,
          gender: GENDER_TO_FORM[horse.gender],
          origin: horse.origin,
          type: horse.type,
          tags: horse.tags,
        }}
        tagOptions={tagOptions}
        redirectTo="/admin/horses"
      />
    </AdminFormPage>
  );
}
