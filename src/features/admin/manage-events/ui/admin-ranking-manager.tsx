'use client';

import {
  formatSignedYen,
  rankByBasis,
  type RankingData,
  type RankingDisplayMode,
  resultDiff,
} from '@/entities/ranking';
import { updateRankingDisplayMode } from '@/entities/ranking/actions';
import { AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { medalRankClass } from '@/shared/constants/rank-medal';
import { toast } from '@/shared/lib/toast';
import { Badge, Button, TableBody, TableEmptyRow, TableHead, TableRow, Td, Th } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import { Banknote, EyeOff, Trophy, Users } from 'lucide-react';
import { useOptimistic, useState, useTransition } from 'react';

interface AdminRankingManagerProps {
  eventId: string;
  initialRanking: RankingData[];
  initialDisplayMode: RankingDisplayMode;
  distributeAmount: number;
}

// 管理者ビューの見方。通常は所持金、借入有りは借入を差し引いた純資産で順位と収支を出す
const ADMIN_VIEWS = ['normal', 'loan'] as const;
type AdminView = (typeof ADMIN_VIEWS)[number];

const VIEW_LABELS = { normal: '通常', loan: '借入有り' } satisfies Record<AdminView, string>;

const MODE_LABELS = {
  HIDDEN: '非公開',
  ANONYMOUS: '匿名公開',
  FULL: '完全公開',
  FULL_WITH_LOAN: '借金込み公開',
} satisfies Record<RankingDisplayMode, string>;

/** 公開設定に対応する見方。借金込み公開なら借入有り、それ以外は通常。 */
function viewFor(mode: RankingDisplayMode): AdminView {
  return mode === 'FULL_WITH_LOAN' ? 'loan' : 'normal';
}

/** 管理者向けの所持金は伏せられないため数値として扱う。 */
function balanceOf(user: RankingData): number {
  return user.balance === '???' ? 0 : user.balance;
}

export function AdminRankingManager({
  eventId,
  initialRanking,
  initialDisplayMode,
  distributeAmount,
}: AdminRankingManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticMode, setOptimisticMode] = useOptimistic(
    initialDisplayMode,
    (_state, newMode: RankingDisplayMode) => newMode
  );
  // 手動で切り替えた見方は、その時の公開設定の間だけ有効。公開設定が変わると設定に合わせて自動で切り替わる
  const [viewOverride, setViewOverride] = useState<{ mode: RankingDisplayMode; view: AdminView } | null>(null);
  const view = viewOverride?.mode === optimisticMode ? viewOverride.view : viewFor(optimisticMode);

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

  const includeLoan = view === 'loan';
  const rows = rankByBasis(initialRanking, (user) =>
    includeLoan ? balanceOf(user) - (user.totalLoaned ?? 0) : balanceOf(user)
  );

  return (
    <div className="space-y-6">
      <div className="rounded-surface border border-gray-100 bg-white p-6">
        <AdminSectionTitle className="mb-4">公開設定</AdminSectionTitle>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              現在の設定: <span className="font-medium text-gray-900">{MODE_LABELS[optimisticMode]}</span>
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
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <AdminSectionTitle icon={Trophy}>ランキング一覧</AdminSectionTitle>
          <fieldset className="flex flex-wrap items-center gap-4 text-sm">
            <legend className="sr-only">表示の切り替え</legend>
            <span className="text-gray-500">表示</span>
            {ADMIN_VIEWS.map((candidate) => (
              <span key={candidate} className="flex items-center gap-1.5">
                <input
                  id={`admin-ranking-view-${candidate}`}
                  type="radio"
                  name="admin-ranking-view"
                  value={candidate}
                  aria-label={VIEW_LABELS[candidate]}
                  checked={view === candidate}
                  onChange={() => setViewOverride({ mode: optimisticMode, view: candidate })}
                  className="accent-turf-700 h-4 w-4"
                />
                <label htmlFor={`admin-ranking-view-${candidate}`} className="text-gray-900">
                  {VIEW_LABELS[candidate]}
                </label>
              </span>
            ))}
            <span className="text-gray-500">公開設定に合わせて自動で切り替わります</span>
          </fieldset>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <TableHead>
              <Th>順位</Th>
              <Th>ユーザー名</Th>
              <Th className="text-right">所持金</Th>
              <Th className="text-right">収支</Th>
              {includeLoan && <Th className="text-right">借入総額</Th>}
            </TableHead>
            <TableBody>
              {rows.length === 0 && <TableEmptyRow colSpan={includeLoan ? 5 : 4}>参加者がいません</TableEmptyRow>}
              {rows.map((user) => {
                const diff = resultDiff(balanceOf(user), distributeAmount, includeLoan ? user.totalLoaned : 0);
                return (
                  <TableRow key={user.userId}>
                    <Td>
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${
                          medalRankClass(user.rank) ?? 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {user.rank}
                      </div>
                    </Td>
                    <Td className="font-medium text-gray-900">{user.name}</Td>
                    <Td className="text-right font-medium text-gray-900 tabular-nums">
                      {balanceOf(user).toLocaleString('ja-JP')} 円
                    </Td>
                    <Td className="text-right tabular-nums">
                      <span className={cn('font-medium', diff >= 0 ? 'text-green-600' : 'text-red-500')}>
                        {formatSignedYen(diff)}
                      </span>
                    </Td>
                    {includeLoan && (
                      <Td className="text-right">
                        {user.totalLoaned && user.totalLoaned > 0 ? (
                          <Badge
                            label={`借入有り ${user.totalLoaned.toLocaleString('ja-JP')}円`}
                            className="bg-orange-100 text-orange-800 tabular-nums ring-orange-200"
                          />
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </Td>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </table>
        </div>
      </div>
    </div>
  );
}
