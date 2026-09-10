import { getEventRanking } from '@/features/ranking/actions';
import { RankingList } from '@/features/ranking/components/ranking-list';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { PageContainer } from '@/shared/ui/layout/page-container';
import { PageHeader } from '@/shared/ui/layout/page-header';
import { Trophy } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface RankingPageProps {
  params: Promise<{ eventId: string }>;
}

export const metadata: Metadata = {
  title: 'イベントランキング',
};

export default async function RankingPage({ params }: RankingPageProps) {
  const { eventId } = await params;

  let rankingData;
  try {
    rankingData = await getEventRanking(eventId);
  } catch {
    notFound();
  }

  const { eventName, ranking, published } = rankingData;

  return (
    <PageContainer>
      <Breadcrumbs
        items={[
          { label: 'マイページ', href: '/mypage' },
          { label: '即BET', href: '/mypage/sokubet' },
          { label: eventName },
          { label: 'イベントランキング' },
        ]}
      />

      <PageHeader title="イベントランキング" description={eventName} icon={Trophy} />

      <RankingList
        eventId={eventId}
        initialRanking={ranking}
        initialPublished={published}
        initialDisplayMode={rankingData.displayMode}
        distributeAmount={rankingData.distributeAmount}
        showLiveStatus
      />
    </PageContainer>
  );
}
