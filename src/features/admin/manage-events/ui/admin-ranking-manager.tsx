'use client';

import { type RankingData } from '@/entities/ranking';
import { AdminBackLink, AdminPageHeader, AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { type RankingDisplayMode, updateRankingDisplayMode } from '@/features/ranking';
import { toast } from '@/shared/lib/toast';
import { Badge, Button, TableBody, TableEmptyRow, TableHead, TableRow, Td, Th } from '@/shared/ui';
import { Banknote, EyeOff, Trophy, Users } from 'lucide-react';
import { useOptimistic, useTransition } from 'react';

interface AdminRankingManagerProps {
  eventId: string;
  eventName: string;
  initialRanking: RankingData[];
  initialDisplayMode: RankingDisplayMode;
  distributeAmount: number;
}

export function AdminRankingManager({
  eventId,
  eventName,
  initialRanking,
  initialDisplayMode,
  distributeAmount,
}: AdminRankingManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticMode, setOptimisticMode] = useOptimistic(
    initialDisplayMode,
    (_state, newMode: RankingDisplayMode) => newMode
  );

  const handleModeChange = (mode: RankingDisplayMode) => {
    startTransition(async () => {
      setOptimisticMode(mode);
      try {
        await updateRankingDisplayMode(eventId, mode);
        toast.success('ランキング公開設定を更新しました');
      } catch (error) {
        console.error(error);
        toast.error('設定の更新に失敗しました');
      }
    });
  };

  const getDisplayModeLabel = (mode: RankingDisplayMode) => {
    switch (mode) {
      case 'HIDDEN':
        return '非公開';
      case 'ANONYMOUS':
        return '匿名公開';
      case 'FULL':
        return '完全公開';
      case 'FULL_WITH_LOAN':
        return '公開 (借金込み)';
      default:
        return mode;
    }
  };

  const currentModeLabel = getDisplayModeLabel(optimisticMode);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <AdminBackLink href={`/admin/events/${eventId}`}>イベント詳細へ戻る</AdminBackLink>
        <AdminPageHeader title="ランキング管理" description={`${eventName} のランキング確認と公開設定`} />
      </div>

      <div className="rounded-surface border border-gray-100 bg-white p-6">
        <AdminSectionTitle className="mb-4">公開設定</AdminSectionTitle>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              現在の設定: <span className="font-medium text-gray-900">{currentModeLabel}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={optimisticMode === 'HIDDEN' ? 'secondary' : 'outline'}
              disabled={isPending}
              onClick={() => handleModeChange('HIDDEN')}
              className={optimisticMode === 'HIDDEN' ? 'bg-gray-200 text-gray-900' : ''}
            >
              <EyeOff className="mr-2 h-4 w-4" />
              非公開
            </Button>
            <Button
              size="sm"
              variant={optimisticMode === 'ANONYMOUS' ? 'secondary' : 'outline'}
              disabled={isPending}
              onClick={() => handleModeChange('ANONYMOUS')}
              className={optimisticMode === 'ANONYMOUS' ? 'bg-turf-100 text-turf-900 hover:bg-turf-200' : ''}
            >
              <Users className="mr-2 h-4 w-4" />
              匿名公開
            </Button>
            <Button
              size="sm"
              variant={optimisticMode === 'FULL' ? 'secondary' : 'outline'}
              disabled={isPending}
              onClick={() => handleModeChange('FULL')}
              className={optimisticMode === 'FULL' ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : ''}
            >
              <Trophy className="mr-2 h-4 w-4" />
              公開
            </Button>
            <Button
              size="sm"
              variant={optimisticMode === 'FULL_WITH_LOAN' ? 'secondary' : 'outline'}
              disabled={isPending}
              onClick={() => handleModeChange('FULL_WITH_LOAN')}
              className={optimisticMode === 'FULL_WITH_LOAN' ? 'bg-orange-100 text-orange-900 hover:bg-orange-200' : ''}
            >
              <Banknote className="mr-2 h-4 w-4" />
              借金込み
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-surface overflow-hidden border border-gray-100 bg-white">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <AdminSectionTitle icon={Trophy}>ランキング一覧 (管理者ビュー)</AdminSectionTitle>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <TableHead>
              <Th>順位</Th>
              <Th>ユーザー名</Th>
              <Th className="text-right">所持金</Th>
              <Th className="text-right">収支</Th>
              <Th className="text-right">借入総額</Th>
            </TableHead>
            <TableBody>
              {initialRanking.length === 0 && <TableEmptyRow colSpan={5}>参加者がいません</TableEmptyRow>}
              {initialRanking.map((user) => (
                <TableRow key={user.userId}>
                  <Td>
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${
                        user.rank === 1
                          ? 'bg-amber-100 text-amber-700'
                          : user.rank === 2
                            ? 'bg-gray-200 text-gray-700'
                            : user.rank === 3
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {user.rank}
                    </div>
                  </Td>
                  <Td className="font-medium text-gray-900">{user.name}</Td>
                  <Td className="text-right font-medium text-gray-900">
                    {Number(user.balance).toLocaleString('ja-JP')} 円
                  </Td>
                  <Td className="text-right">
                    <span
                      className={`font-medium ${
                        Number(user.balance) - distributeAmount >= 0 ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {Number(user.balance) - distributeAmount >= 0 ? '+' : ''}
                      {(Number(user.balance) - distributeAmount).toLocaleString('ja-JP')}
                    </span>
                  </Td>
                  <Td className="text-right">
                    {user.totalLoaned && user.totalLoaned > 0 ? (
                      <Badge
                        label={`${user.totalLoaned.toLocaleString('ja-JP')} 円`}
                        className="bg-orange-100 text-orange-800 ring-orange-200"
                      />
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </table>
        </div>
      </div>
    </div>
  );
}
