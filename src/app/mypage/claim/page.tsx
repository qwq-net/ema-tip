import { EventClaimList } from '@/features/economy/claim';
import { getEventsWithJoinStatus } from '@/features/economy/claim/queries';
import { PageContainer } from '@/shared/ui/layout/page-container';
import { requireLoginPage } from '@/shared/utils/admin';

import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'お小遣いを貰う',
};

export default async function ClaimPage() {
  const session = await requireLoginPage();

  const eventsWithJoinStatus = await getEventsWithJoinStatus(session.user.id);

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'マイページ', href: '/mypage' }, { label: 'お小遣いを貰う' }]} />

      <div>
        <h1 className="text-text-main text-3xl font-semibold">お小遣いを貰う</h1>
        <p className="text-text-sub text-sm">開催中のイベントに参加して、軍資金を受け取りましょう。</p>
      </div>

      <section>
        <EventClaimList events={eventsWithJoinStatus} />
      </section>
    </PageContainer>
  );
}
