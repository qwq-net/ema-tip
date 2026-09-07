import { AdminSidebar } from '@/features/admin/ui/admin-sidebar';
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

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar user={user} />
      <main id="main" className="flex-1 overflow-y-auto p-6 pt-16 sm:p-8 md:pt-8 md:pl-72">
        {children}
      </main>
    </div>
  );
}
