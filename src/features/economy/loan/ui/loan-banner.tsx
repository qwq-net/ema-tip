'use client';

import { isEligibleForLoan } from '@/entities/wallet';
import { toast } from '@/shared/lib/toast';
import { Button, Card } from '@/shared/ui';
import { AlertTriangle, Banknote } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { borrowLoan } from '../actions';

interface LoanBannerProps {
  eventId: string;
  balance: number;
  distributeAmount: number;
  loanAmount: number;
  hasLoaned: boolean;
}

export function LoanBanner({ eventId, balance, distributeAmount, loanAmount, hasLoaned }: LoanBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [completed, setCompleted] = useState(false);

  const shouldShow = isEligibleForLoan(balance, distributeAmount, hasLoaned) && !completed;

  if (!shouldShow) return null;

  const handleBorrow = () => {
    startTransition(async () => {
      try {
        await borrowLoan(eventId);
        setCompleted(true);
        setShowConfirm(false);
        router.refresh();
      } catch {
        setShowConfirm(false);
        toast.error('融資の処理に失敗しました');
      }
    });
  };

  if (showConfirm) {
    return (
      <Card className="border-0 bg-amber-400 p-4 text-orange-950">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">逆転への招待状</h3>
          </div>
          <p className="text-sm">
            勝利まであと一歩かもしれません。今ここで諦めるのはもったいない。
            <span className="font-semibold">{loanAmount.toLocaleString('ja-JP')}円</span> の特別融資で、栄光をその手に。
            手続きは一瞬、夢は永遠です。借り入れはイベントにつき1回のみ可能です。
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={isPending}
              onClick={handleBorrow}
              className="bg-white font-semibold text-orange-700 hover:bg-orange-50"
            >
              {isPending ? '処理中...' : '栄光を掴みに行く'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => setShowConfirm(false)}
              className="text-orange-950 hover:bg-white/20"
            >
              今は見送る
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <button
      type="button"
      className="rounded-surface block w-full border-0 bg-amber-400 p-4 text-left text-orange-950 transition-opacity hover:opacity-90"
      onClick={() => setShowConfirm(true)}
    >
      <span className="flex items-center justify-between">
        <span>
          <span className="flex items-center gap-2 text-lg font-semibold">
            <span className="rounded-chip bg-white px-2 py-0.5 text-sm text-orange-700">特別提案</span>
            資金が少し不足していませんか？
          </span>
          <span className="mt-1 block text-sm">
            <span className="font-semibold">{loanAmount.toLocaleString('ja-JP')}円</span>{' '}
            の追加資金で、大きな夢を掴みましょう。
          </span>
        </span>
        <Banknote className="h-8 w-8 shrink-0 text-orange-900" />
      </span>
    </button>
  );
}
