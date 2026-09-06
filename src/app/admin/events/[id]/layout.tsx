import { getEvent } from '@/features/admin/manage-events/actions';
import { EventStatusPanel } from '@/features/admin/manage-events/ui/event-status-control';
import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { AdminTabs } from '@/features/admin/ui/admin-tabs';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Crown, Medal, Settings2, Trophy } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

/** イベント詳細の共通枠。見出しとタブを持ち、配下のレース・設定・BET5・ランキングの各ページを切り替える。 */
export default async function EventDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) {
    notFound();
  }

  const base = `/admin/events/${id}`;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'イベント管理', href: '/admin/events' }, { label: event.name }]} />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <AdminPageHeader title={event.name} description={event.date} />
        <EventStatusPanel eventId={id} status={event.status} className="md:min-w-96" />
      </div>
      <AdminTabs
        items={[
          { href: base, label: 'レース', icon: <Trophy className="h-4 w-4" /> },
          { href: `${base}/settings`, label: 'イベント設定', icon: <Settings2 className="h-4 w-4" /> },
          { href: `${base}/bet5`, label: 'BET5', icon: <Crown className="h-4 w-4" /> },
          { href: `${base}/ranking`, label: 'ランキング', icon: <Medal className="h-4 w-4" /> },
        ]}
      />
      {children}
    </div>
  );
}
