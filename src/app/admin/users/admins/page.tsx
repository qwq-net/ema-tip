import { DiscordAdminList, getAdminDiscordIds } from '@/features/admin/discord-admins';
import { AdminPage } from '@/features/admin/ui/admin-page';
import { AdminPageHeader } from '@/shared/ui/layout/admin-page-header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discord管理者ID',
};

export default async function DiscordAdminsPage() {
  const entries = await getAdminDiscordIds();

  return (
    <AdminPage>
      <AdminPageHeader
        title="Discord管理者ID"
        description="ここに登録した Discord ID で初めてログインした人は、管理者として登録されます。登録済みの利用者の役割は変わりません。"
      />
      <DiscordAdminList entries={entries} />
    </AdminPage>
  );
}
