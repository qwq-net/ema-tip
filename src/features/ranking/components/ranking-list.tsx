'use client';

import type { RankingData } from '@/entities/ranking';
import { useRankingEvents } from '@/features/ranking/hooks/use-ranking-events';
import { Badge, LiveConnectionStatus } from '@/shared/ui';
import { Trophy, Users } from 'lucide-react';
import type { RankingDisplayMode } from '../actions';

interface RankingListProps {
  eventId: string;
  initialRanking: RankingData[];
  initialPublished: boolean;
  initialDisplayMode: RankingDisplayMode;
  distributeAmount: number;
}

export function RankingList({
  eventId,
  initialRanking,
  initialPublished,
  initialDisplayMode,
  distributeAmount,
}: RankingListProps) {
  const ranking = initialRanking;
  const published = initialPublished;
  const displayMode = initialDisplayMode;

  const { connectionStatus } = useRankingEvents({
    eventId,
  });

  const getStatusLabel = () => {
    if (!published) return '待機中';
    if (displayMode === 'ANONYMOUS') return '匿名公開中';
    if (displayMode === 'FULL_WITH_LOAN') return '公開中 (借金込み)';
    return '公開中';
  };

  const getStatusColor = () => {
    if (!published) return 'bg-gray-200 text-gray-700';
    if (displayMode === 'ANONYMOUS') return 'bg-turf-100 text-turf-800';
    if (displayMode === 'FULL_WITH_LOAN') return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="w-full space-y-4">
      <div className="rounded-control flex items-center justify-between bg-gray-50 p-4">
        <div className="flex items-center gap-2">
          <Badge variant="status" label={getStatusLabel()} className={getStatusColor()} />
          <span className="text-sm text-gray-500">{published ? '現在の順位' : '結果発表までお待ちください'}</span>
        </div>
        <LiveConnectionStatus status={connectionStatus} showText={false} />
      </div>

      <div className="rounded-surface overflow-hidden border border-gray-200 bg-white">
        <div className="border-b border-gray-100 bg-linear-to-r from-gray-50 to-white px-6 py-4">
          <div className="flex items-center gap-2">
            <Trophy className={`h-5 w-5 ${published ? 'text-amber-500' : 'text-text-sub'}`} />
            <h2 className="font-semibold text-gray-900">ランキング</h2>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {ranking.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users className="mb-2 h-8 w-8 opacity-20" />
              <p>参加者がいません</p>
            </div>
          ) : (
            ranking.map((user) => (
              <div
                key={user.userId}
                className={`flex items-center justify-between px-6 py-4 transition-colors ${
                  user.isCurrentUser ? 'bg-turf-50/70' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold ${
                      user.rank === 1
                        ? 'bg-amber-100 text-amber-700'
                        : user.rank === 2
                          ? 'bg-gray-100 text-gray-700'
                          : user.rank === 3
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-white text-gray-500'
                    }`}
                  >
                    {user.rank}
                  </div>
                  <div>
                    <div className={`font-medium ${user.isCurrentUser ? 'text-turf-800' : 'text-gray-900'}`}>
                      {user.name}
                      {user.isCurrentUser && <span className="text-turf-600 ml-2 text-sm font-normal">あなた</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.totalLoaned !== undefined && user.totalLoaned > 0 && (
                    <span className="mr-1 rounded-full bg-orange-100 px-2 py-0.5 text-sm font-semibold text-orange-700">
                      借入 {user.totalLoaned.toLocaleString('ja-JP')}円
                    </span>
                  )}
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {user.balance === '???' ? user.balance : user.balance.toLocaleString('ja-JP')}
                      {user.balance !== '???' && '円'}
                    </div>
                    {user.balance !== '???' && (
                      <div
                        className={`text-sm font-medium ${
                          user.balance - distributeAmount >= 0 ? 'text-blue-600' : 'text-red-600'
                        }`}
                      >
                        ({user.balance - distributeAmount >= 0 ? '+' : ''}
                        {(user.balance - distributeAmount).toLocaleString('ja-JP')})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
