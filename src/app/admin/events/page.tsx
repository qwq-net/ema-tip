import { EventList } from '@/features/admin/manage-events';
import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { db } from '@/shared/db';
import { events } from '@/shared/db/schema';
import { Button } from '@/shared/ui';
import { desc } from 'drizzle-orm';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'イベント管理',
};

export default async function AdminEventsPage() {
  const allEvents = await db.query.events.findMany({
    orderBy: [desc(events.date), desc(events.createdAt)],
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="イベント管理" description="イベントの作成・ステータス管理を行います" />

      <div className="space-y-4">
        <div className="flex items-end justify-between px-2">
          <h2 className="text-xl font-semibold text-gray-900">すべてのイベント</h2>
          <Button asChild className="flex items-center gap-2 font-semibold transition active:scale-[.96]">
            <Link href="/admin/events/new">
              <Plus className="h-4 w-4" />
              新規イベント作成
            </Link>
          </Button>
        </div>

        <EventList events={allEvents} />
      </div>
    </div>
  );
}
