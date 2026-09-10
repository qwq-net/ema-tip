import { AdminDashboard } from '@/features/admin/dashboard/ui/admin-dashboard';
import { db } from '@/shared/db';
import { events } from '@/shared/db/schema';
import { asc, inArray } from 'drizzle-orm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '管理者ダッシュボード',
};

export default async function AdminPage() {
  const candidates = await db.query.events.findMany({
    where: inArray(events.status, ['ACTIVE', 'SCHEDULED']),
    orderBy: [asc(events.date), asc(events.createdAt)],
    columns: { id: true, name: true, date: true, status: true },
    // 進行状況の文言にだけ使うため、レースは状態だけ読む
    with: { races: { columns: { status: true } } },
  });

  return <AdminDashboard events={candidates} />;
}
