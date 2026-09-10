import { getEvent } from '@/features/admin/manage-events/actions';
import { EventStatusPanel } from '@/features/admin/manage-events/ui/event-status-control';
import { AdminPage } from '@/features/admin/ui/admin-page';
import { AdminTabs } from '@/features/admin/ui/admin-tabs';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { AdminPageHeader } from '@/shared/ui/layout/admin-page-header';
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
    <AdminPage>
      <Breadcrumbs items={[{ label: 'イベント管理', href: '/admin/events' }, { label: event.name }]} />
      <AdminPageHeader
        title={event.name}
        description={event.date}
        actions={<EventStatusPanel eventId={id} status={event.status} />}
      />
      <AdminTabs
        items={[
          { href: base, label: 'レース', icon: <Trophy /> },
          { href: `${base}/settings`, label: 'イベント設定', icon: <Settings2 /> },
          { href: `${base}/bet5`, label: 'BET5', icon: <Crown /> },
          { href: `${base}/ranking`, label: 'ランキング', icon: <Medal /> },
        ]}
      />
      {children}
    </AdminPage>
  );
}
