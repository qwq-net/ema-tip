import { AdminShell } from '@/features/admin/ui/admin-shell';
import { canAccessAdminRoute, TIPSTER_DEFAULT_ROUTE } from '@/shared/config/admin-permissions';
import { auth } from '@/shared/config/auth';
import { canAccessAdminPanel } from '@/shared/utils/auth-helpers';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;

  if (!user || !canAccessAdminPanel(user)) {
    redirect('/');
  }

  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '';

  if (pathname && !canAccessAdminRoute(pathname, user.role)) {
    redirect(TIPSTER_DEFAULT_ROUTE);
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
