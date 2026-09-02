import { getEventRanking } from '@/features/ranking/actions';
import { RankingList } from '@/features/ranking/components/ranking-list';
import { ChevronLeft, Trophy } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
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

  const { ranking, published } = rankingData;

  return (
    <div className="flex flex-col items-center p-4 lg:p-8">
      <div className="w-full max-w-5xl space-y-8">
        <div className="flex items-center gap-4">
          <Link
            href="/mypage"
            className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft size={16} />
            マイページへ戻る
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-turf-100 text-turf-800 rounded-surface flex h-12 w-12 items-center justify-center">
            <Trophy size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">イベントランキング</h1>
            <p className="text-gray-500">参加ユーザーの現在の順位を確認できます。</p>
          </div>
        </div>

        <div className="mx-auto w-full">
          <RankingList
            eventId={eventId}
            initialRanking={ranking}
            initialPublished={published}
            initialDisplayMode={rankingData.displayMode}
            distributeAmount={rankingData.distributeAmount}
          />
        </div>
      </div>
    </div>
  );
}
