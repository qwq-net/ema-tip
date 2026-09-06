import { getEvent } from '@/features/admin/manage-events/actions';
import { EventStatusPanel } from '@/features/admin/manage-events/ui/event-status-control';
import { AdminBackLink, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { AdminTabs } from '@/features/admin/ui/admin-tabs';
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
      <AdminBackLink href="/admin/events" />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <AdminPageHeader title={event.name} description={event.date} />
        <EventStatusPanel eventId={id} status={event.status} className="md:min-w-96" />
      </div>
      <AdminTabs
        items={[
          { href: base, label: 'レース' },
          { href: `${base}/settings`, label: 'イベント設定' },
          { href: `${base}/bet5`, label: 'BET5' },
          { href: `${base}/ranking`, label: 'ランキング' },
        ]}
      />
      {children}
    </div>
  );
}
