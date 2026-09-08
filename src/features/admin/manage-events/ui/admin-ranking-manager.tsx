'use client';

import {
  formatSignedYen,
  rankByBasis,
  type RankingData,
  type RankingDisplayMode,
  resultDiff,
  resultDiffClass,
} from '@/entities/ranking';
import { updateRankingDisplayMode } from '@/entities/ranking/actions';
import { AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { medalRankClass } from '@/shared/constants/rank-medal';
import { toast } from '@/shared/lib/toast';
import { Button, Card, TableBody, TableEmptyRow, TableHead, TableRow, Td, Th } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import { Banknote, EyeOff, Trophy, Users } from 'lucide-react';
import { useOptimistic, useState, useTransition } from 'react';

// 順位はサーバーで付けず、見方に応じてこの部品が付ける
type UnrankedRankingData = Omit<RankingData, 'rank'>;

interface AdminRankingManagerProps {
  eventId: string;
  initialRanking: UnrankedRankingData[];
  initialDisplayMode: RankingDisplayMode;
  distributeAmount: number;
}

// 管理者ビューの見方。通常は所持金、借入ありは借入を差し引いた純資産で順位と収支を出す
const ADMIN_VIEWS = ['normal', 'loan'] as const;
type AdminView = (typeof ADMIN_VIEWS)[number];

const VIEW_LABELS = { normal: '通常', loan: '借入あり' } satisfies Record<AdminView, string>;

const MODE_LABELS = {
  HIDDEN: '非公開',
  ANONYMOUS: '匿名公開',
  FULL: '完全公開',
  FULL_WITH_LOAN: '借金込み公開',
} satisfies Record<RankingDisplayMode, string>;

/** 公開設定に対応する見方。借金込み公開なら借入あり、それ以外は通常。 */
function viewFor(mode: RankingDisplayMode): AdminView {
  return mode === 'FULL_WITH_LOAN' ? 'loan' : 'normal';
}

/** 管理者向けの所持金は伏せられないため数値として扱う。 */
function balanceOf(user: UnrankedRankingData): number {
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
      const result = await updateRankingDisplayMode(eventId, mode);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('ランキング公開設定を更新しました');
    });
  };

  const includeLoan = view === 'loan';
  const rows = rankByBasis(initialRanking, (user) =>
    includeLoan ? balanceOf(user) - (user.totalLoaned ?? 0) : balanceOf(user)
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <AdminSectionTitle className="mb-4">公開設定</AdminSectionTitle>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-text-sub text-sm">
              現在の設定: <span className="text-text-main font-semibold">{MODE_LABELS[optimisticMode]}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={optimisticMode === 'HIDDEN' ? 'secondary' : 'outline'}
              disabled={isPending}
              onClick={() => handleModeChange('HIDDEN')}
              className={optimisticMode === 'HIDDEN' ? 'text-text-main bg-gray-200' : ''}
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
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <AdminSectionTitle icon={Trophy}>ランキング一覧</AdminSectionTitle>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div role="group" aria-label="表示の切り替え" className="rounded-control inline-flex bg-gray-100 p-0.5">
              {ADMIN_VIEWS.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  aria-pressed={view === candidate}
                  onClick={() => setViewOverride({ mode: optimisticMode, view: candidate })}
                  className={cn(
                    'rounded-control px-3 py-1 font-semibold transition-colors',
                    view === candidate
                      ? 'text-text-main bg-white ring-1 ring-gray-200'
                      : 'text-text-sub hover:text-text-main'
                  )}
                >
                  {VIEW_LABELS[candidate]}
                </button>
              ))}
            </div>
            <span className="text-text-sub">公開設定に合わせて自動で切り替わります</span>
          </div>
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
                          medalRankClass(user.rank) ?? 'text-text-sub bg-gray-100'
                        }`}
                      >
                        {user.rank}
                      </div>
                    </Td>
                    <Td className="text-text-main font-semibold">{user.name}</Td>
                    <Td className="text-text-main text-right font-semibold tabular-nums">
                      {balanceOf(user).toLocaleString('ja-JP')} 円
                    </Td>
                    <Td className="text-right tabular-nums">
                      <span className={cn('font-semibold', resultDiffClass(diff))}>{formatSignedYen(diff)}</span>
                    </Td>
                    {includeLoan && (
                      <Td className="text-right">
                        {user.totalLoaned && user.totalLoaned > 0 ? (
                          <span className="font-semibold text-red-500 tabular-nums">
                            -{user.totalLoaned.toLocaleString('ja-JP')}円
                          </span>
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
      </Card>
    </div>
  );
}
