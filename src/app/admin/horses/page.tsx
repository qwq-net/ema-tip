import { HorseList } from '@/features/admin/manage-horses';
import { AdminLoadingCard, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Button } from '@/shared/ui';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: '馬マスタ管理',
};

export default async function HorsesPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="馬マスタ管理" description="競走馬の新規登録と情報の管理を行います" />

      <div className="space-y-4">
        <div className="flex items-end justify-between px-2">
          <h2 className="text-xl font-semibold text-gray-900">登録済みの馬</h2>
          <Button
            asChild
            className="flex items-center gap-2 font-semibold shadow-sm transition-all hover:shadow-md active:scale-95"
          >
            <Link href="/admin/horses/new">
              <Plus className="h-4 w-4" />
              新規馬登録
            </Link>
          </Button>
        </div>

        <Suspense fallback={<AdminLoadingCard />}>
          <HorseList />
        </Suspense>
      </div>
    </div>
  );
}
