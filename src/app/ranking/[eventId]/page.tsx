import { getEventRanking } from '@/features/ranking/actions';
import { RankingList } from '@/features/ranking/components/ranking-list';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { PageContainer } from '@/shared/ui/layout/page-container';
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

      <div className="flex items-center gap-3">
        <div className="bg-turf-100 text-turf-800 rounded-surface flex h-12 w-12 items-center justify-center">
          <Trophy size={28} />
        </div>
        <div>
          <h1 className="text-text-main text-3xl font-semibold">イベントランキング</h1>
          <p className="text-text-sub">{eventName}</p>
        </div>
      </div>

      <div className="mx-auto w-full">
        <RankingList
          eventId={eventId}
          initialRanking={ranking}
          initialPublished={published}
          initialDisplayMode={rankingData.displayMode}
          distributeAmount={rankingData.distributeAmount}
          showLiveStatus
        />
      </div>
    </PageContainer>
  );
}
