import { EventList } from '@/features/admin/manage-events';
import { AdminPage } from '@/features/admin/ui/admin-page';
import { db } from '@/shared/db';
import { events } from '@/shared/db/schema';
import { Button, SectionTitle } from '@/shared/ui';
import { AdminPageHeader } from '@/shared/ui/layout/admin-page-header';
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
    <AdminPage>
      <AdminPageHeader title="イベント管理" description="イベントの作成・ステータス管理を行います" />
      <SectionTitle
        actions={
          <Button asChild>
            <Link href="/admin/events/new">
              <Plus />
              新規イベント作成
            </Link>
          </Button>
        }
      >
        すべてのイベント
      </SectionTitle>
      <EventList events={allEvents} />
    </AdminPage>
  );
}
