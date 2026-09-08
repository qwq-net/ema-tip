import { UserList, getUsers } from '@/features/admin/manage-users';
import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { requireAdmin } from '@/shared/utils/admin';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ユーザー管理',
};

export default async function AdminUsersPage() {
  const session = await requireAdmin();

  const allUsers = await getUsers();

  return (
    <div className="space-y-6">
      <AdminPageHeader title="ユーザー管理" description={`${allUsers.length} 人が登録されています`} />

      <UserList users={allUsers} currentUserId={session.user.id} />
    </div>
  );
}
