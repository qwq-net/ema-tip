import { getEventRanking } from '@/features/ranking/actions';
import { RankingList } from '@/features/ranking/components/ranking-list';
import { RankingModal } from '@/features/ranking/components/ranking-modal';

interface InterceptedRankingPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function InterceptedRankingPage({ params }: InterceptedRankingPageProps) {
  const { eventId } = await params;

  let data;
  try {
    data = await getEventRanking(eventId);
  } catch {
    return null;
  }

  const { eventName, ranking, published, displayMode, distributeAmount } = data;

  return (
    <RankingModal eventName={eventName}>
      <RankingList
        eventId={eventId}
        initialRanking={ranking}
        initialPublished={published}
        initialDisplayMode={displayMode}
        distributeAmount={distributeAmount}
      />
    </RankingModal>
  );
}
