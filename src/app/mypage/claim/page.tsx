import { EventClaimList } from '@/features/economy/claim';
import { getEventsWithJoinStatus } from '@/features/economy/claim/queries';
import { PageContainer } from '@/shared/ui/layout/page-container';
import { PageHeader } from '@/shared/ui/layout/page-header';
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
      <PageHeader title="お小遣いを貰う" description="開催中のイベントに参加して、軍資金を受け取りましょう。" />
      <EventClaimList events={eventsWithJoinStatus} />
    </PageContainer>
  );
}
