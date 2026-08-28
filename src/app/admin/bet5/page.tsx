import { Bet5EventList } from '@/features/admin/bet5/ui/bet5-event-list';
import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { db } from '@/shared/db';
import { events } from '@/shared/db/schema';
import { desc } from 'drizzle-orm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BET5管理',
};

export default async function AdminBet5Page() {
  const allEvents = await db.query.events.findMany({
    orderBy: [desc(events.date), desc(events.createdAt)],
    with: {
      races: {
        orderBy: (raceInstances, { asc }) => [asc(raceInstances.raceNumber), asc(raceInstances.name)],
      },
      bet5Event: {
        with: {
          race1: true,
          race2: true,
          race3: true,
          race4: true,
          race5: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="BET5管理" description="BET5（5レース連続的中投票）のイベント設定を行います" />

      <div className="space-y-4">
        <Bet5EventList events={allEvents} />
      </div>
    </div>
  );
}
