'use client';

import { isEligibleForLoan } from '@/entities/wallet';
import { toast } from '@/shared/lib/toast';
import { ConfirmDialog } from '@/shared/ui';
import { Banknote, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { borrowLoan } from '../actions';

interface LoanBannerProps {
  eventId: string;
  balance: number;
  distributeAmount: number;
  loanAmount: number;
  hasLoaned: boolean;
}

/**
 * 残高が少ないユーザーにだけ現れる特別融資の案内バナー。押すと条件つきの確認モーダルを開き、
 * 確定で借入して残高へ即時反映する。対象外のユーザーと借入済み・借入完了後は何も描画しない。
 */
export function LoanBanner({ eventId, balance, distributeAmount, loanAmount, hasLoaned }: LoanBannerProps) {
  const router = useRouter();
  const [completed, setCompleted] = useState(false);

  const shouldShow = isEligibleForLoan(balance, distributeAmount, hasLoaned) && !completed;

  if (!shouldShow) return null;

  const handleBorrow = async () => {
    try {
      await borrowLoan(eventId);
    } catch (error) {
      toast.error('融資の処理に失敗しました');
      throw error;
    }
    toast.success(`${loanAmount.toLocaleString('ja-JP')}円を借り入れました`);
    setCompleted(true);
    router.refresh();
  };

  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          className="rounded-surface block w-full bg-amber-400 p-4 text-left text-orange-950 transition-opacity hover:opacity-90"
        >
          <span className="flex items-center justify-between gap-4">
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-lg font-semibold">
                <span className="rounded-chip bg-white px-2 py-0.5 text-sm text-orange-700">特別提案</span>
                資金が少し不足していませんか？
              </span>
              <span className="mt-1 block text-sm">
                <span className="font-semibold tabular-nums">{loanAmount.toLocaleString('ja-JP')}円</span>{' '}
                の特別融資をご用意しています。
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-orange-700">
              詳しく見る
              <ChevronRight className="h-4 w-4" />
            </span>
          </span>
        </button>
      }
      icon={
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Banknote className="h-6 w-6" />
        </span>
      }
      title="逆転への招待状"
      description={
        <>
          勝利まであと一歩かもしれません。今ここで諦めるのはもったいない。特別融資で栄光をその手に。
          手続きは一瞬、夢は永遠です。
          <span className="rounded-control mt-4 block space-y-2 bg-gray-50 p-4 text-left">
            <span className="flex justify-between text-sm">
              <span className="text-gray-500">融資額</span>
              <span className="font-semibold text-gray-900 tabular-nums">{loanAmount.toLocaleString('ja-JP')}円</span>
            </span>
            <span className="flex justify-between text-sm">
              <span className="text-gray-500">借入回数</span>
              <span className="font-semibold text-gray-900">イベントにつき1回まで</span>
            </span>
          </span>
        </>
      }
      confirmLabel={`${loanAmount.toLocaleString('ja-JP')}円を借りる`}
      confirmVariant="primary"
      onConfirm={handleBorrow}
    />
  );
}
