import { EventList } from '@/features/admin/manage-events';
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
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">イベント管理</h1>
        <p className="mt-1 text-sm text-gray-500">イベントの作成・ステータス管理を行います</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between px-2">
          <h2 className="text-xl font-semibold text-gray-900">すべてのイベント</h2>
          <Button
            asChild
            className="flex items-center gap-2 font-semibold shadow-sm transition-all hover:shadow-md active:scale-95"
          >
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
