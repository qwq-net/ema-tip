'use client';

import {
  formatSignedYen,
  type RankingData,
  type RankingDisplayMode,
  resultDiff,
  resultDiffClass,
} from '@/entities/ranking';
import { useRankingEvents } from '@/features/ranking/hooks/use-ranking-events';
import { medalRankClass } from '@/shared/constants/rank-medal';
import { Badge, LiveStatusPill } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import { Trophy, Users } from 'lucide-react';

interface RankingListProps {
  eventId: string;
  initialRanking: RankingData[];
  initialPublished: boolean;
  initialDisplayMode: RankingDisplayMode;
  distributeAmount: number;
  /** 画面右上に結果待機と同じ LIVE ピルを固定表示する。モーダル内では親画面が持つため出さない。 */
  showLiveStatus?: boolean;
}

/** 公開状態のバッジ。借金込みは公開中のバッジと並べて別のバッジで示す。 */
function StatusBadges({ published, displayMode }: { published: boolean; displayMode: RankingDisplayMode }) {
  if (!published) return <Badge variant="status" label="待機中" className="bg-gray-200 text-gray-700" />;
  if (displayMode === 'ANONYMOUS') {
    return <Badge variant="status" label="匿名公開中" className="bg-turf-100 text-turf-800" />;
  }
  return (
    <>
      <Badge variant="status" label="公開中" className="bg-green-100 text-green-800" />
      {displayMode === 'FULL_WITH_LOAN' && (
        <Badge variant="status" label="借金込み" className="bg-orange-100 text-orange-800" />
      )}
    </>
  );
}

/** 自分の順位・所持金・収支の 1 行。参加していないか金額が伏せられていれば出さない。 */
function MyStanding({ me, distributeAmount }: { me: RankingData | undefined; distributeAmount: number }) {
  if (!me || me.balance === '???') return null;
  const diff = resultDiff(me.balance, distributeAmount, me.totalLoaned);
  return (
    <span className="text-sm text-gray-700 tabular-nums">
      あなたの順位 <span className="text-text-main font-semibold">{me.rank}位</span>
      <span className="mx-1.5 text-gray-300">/</span>
      {me.balance.toLocaleString('ja-JP')}円
      <span className={cn('ml-1 font-semibold', resultDiffClass(diff))}>({formatSignedYen(diff)})</span>
    </span>
  );
}

export function RankingList({
  eventId,
  initialRanking,
  initialPublished,
  initialDisplayMode,
  distributeAmount,
  showLiveStatus = false,
}: RankingListProps) {
  const ranking = initialRanking;
  const published = initialPublished;
  const displayMode = initialDisplayMode;

  const { connectionStatus } = useRankingEvents({
    eventId,
  });
  const me = ranking.find((user) => user.isCurrentUser);

  return (
    <div className="w-full space-y-4">
      {showLiveStatus && <LiveStatusPill status={connectionStatus} fixed />}
      <div className="rounded-control flex flex-wrap items-center justify-between gap-2 bg-gray-50 p-4">
        <div className="flex items-center gap-2">
          <StatusBadges published={published} displayMode={displayMode} />
        </div>
        {published ? (
          <MyStanding me={me} distributeAmount={distributeAmount} />
        ) : (
          <span className="text-text-sub text-sm">結果発表までお待ちください</span>
        )}
      </div>

      <div className="rounded-surface overflow-hidden border border-gray-200 bg-white">
        <div className="border-b border-gray-100 bg-linear-to-r from-gray-50 to-white px-6 py-4">
          <div className="flex items-center gap-2">
            <Trophy className={`h-5 w-5 ${published ? 'text-amber-500' : 'text-text-sub'}`} />
            <h2 className="text-text-main font-semibold">ランキング</h2>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {ranking.length === 0 ? (
            <div className="text-text-sub flex flex-col items-center justify-center py-12">
              <Users className="mb-2 h-8 w-8 opacity-20" />
              <p>参加者がいません</p>
            </div>
          ) : (
            ranking.map((user) => {
              const diff = user.balance === '???' ? null : resultDiff(user.balance, distributeAmount, user.totalLoaned);
              return (
                <div
                  key={user.userId}
                  className={`flex items-center justify-between px-6 py-4 transition-colors ${
                    user.isCurrentUser ? 'bg-turf-50/70' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold ${
                        medalRankClass(user.rank) ?? 'text-text-sub bg-white'
                      }`}
                    >
                      {user.rank}
                    </div>
                    <div className={`font-semibold ${user.isCurrentUser ? 'text-turf-800' : 'text-text-main'}`}>
                      {user.name}
                      {user.isCurrentUser && <span className="text-turf-600 ml-2 text-sm font-normal">あなた</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.totalLoaned !== undefined && user.totalLoaned > 0 && (
                      <Badge label="借入あり" className="mr-1 bg-orange-100 text-orange-700" />
                    )}
                    <div className="text-right tabular-nums">
                      <div className="text-text-main font-semibold">
                        {user.balance === '???' ? '???' : `${user.balance.toLocaleString('ja-JP')}円`}
                      </div>
                      {diff !== null && (
                        <div className={cn('text-sm font-semibold', resultDiffClass(diff))}>
                          ({formatSignedYen(diff)})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
