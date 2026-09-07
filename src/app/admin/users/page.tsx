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
      <div className="flex items-center justify-between">
        <AdminPageHeader title="ユーザー管理" />
        <div className="text-text-sub text-sm">総ユーザー数: {allUsers.length}</div>
      </div>

      <UserList users={allUsers} currentUserId={session.user.id} />
    </div>
  );
}
