import { VenueList } from '@/features/admin/manage-venues/ui/venue-list';
import { Button, Card } from '@/shared/ui';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: '競馬場管理',
};

export default async function AdminVenuesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">開催会場管理</h1>
        <p className="mt-1 text-sm text-gray-500">開催会場の登録・管理を行います</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between px-2">
          <h2 className="text-xl font-semibold text-gray-900">登録済みの会場</h2>
          <Button
            asChild
            className="flex items-center gap-2 font-semibold shadow-sm transition-all hover:shadow-md active:scale-95"
          >
            <Link href="/admin/venues/new">
              <Plus className="h-4 w-4" />
              新規登録
            </Link>
          </Button>
        </div>

        <Suspense fallback={<Card className="py-12 text-center text-gray-500">読み込み中...</Card>}>
          <VenueList />
        </Suspense>
      </div>
    </div>
  );
}
