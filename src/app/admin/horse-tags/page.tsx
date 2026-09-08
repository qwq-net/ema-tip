import { HorseTagList } from '@/features/admin/manage-horse-tags/ui/horse-tag-list';
import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { db } from '@/shared/db';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '馬タグ管理',
};

export default async function HorseTagsPage() {
  const tags = await db.query.horseTagMaster.findMany({
    orderBy: (t, { asc }) => [asc(t.type), asc(t.content)],
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="馬タグ管理"
        description="馬の詳細情報に使うタグを管理します。脚質、特性、来歴、その他の 4 種類があります。"
      />

      <HorseTagList tags={tags} />
    </div>
  );
}
