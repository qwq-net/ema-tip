import { getEvent } from '@/features/admin/manage-events/actions';
import { EventForm } from '@/features/admin/manage-events/ui/event-form';
import { Card, CardContent } from '@/shared/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'イベント設定',
};

/** イベント設定タブ。基本情報のフォームだけを持ち、開始・終了などの状態操作はヘッダーのパネルが担う。 */
export default async function EventSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) {
    notFound();
  }

  // React 19 は form action 完了後にフィールドを初期値へ自動リセットするため、
  // 保存で updatedAt が変わるたびに再マウントし、リセット先を最新のサーバー値へ同期させる
  return (
    <Card>
      <CardContent>
        <EventForm key={event.updatedAt.toISOString()} initialData={event} />
      </CardContent>
    </Card>
  );
}
