import { AdminSidebar } from '@/features/admin/ui/admin-sidebar';
import type { ComponentProps, ReactNode } from 'react';

/**
 * 管理画面のシェル。左にサイドバー、右に縦スクロールする main を置く。
 * main は自前で余白を持つので、配下のページは AdminPage を最上位に置くだけでよい。
 */
export function AdminShell({
  user,
  children,
}: {
  user: ComponentProps<typeof AdminSidebar>['user'];
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar user={user} />
      <main id="main" className="flex-1 overflow-y-auto p-6 pt-16 sm:p-8 md:pt-8 md:pl-72">
        {children}
      </main>
    </div>
  );
}
