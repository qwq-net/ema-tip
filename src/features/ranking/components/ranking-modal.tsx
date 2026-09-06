'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * ランキングをインターセプトルートで重ねるモーダル。
 * 角丸と枠線を持つ外枡は overflow-hidden で固定し、スクロールは内側の領域だけに持たせる。
 * 外枡自身をスクロールさせるとスクロールバーが角丸と枠線の上に描かれて欠けて見えるため。
 */
export function RankingModal({ eventName, children }: { eventName: string; children: React.ReactNode }) {
  const router = useRouter();

  const onDismiss = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-gray-100 px-6 pt-6 pr-12 pb-4">
          <DialogTitle>イベントランキング</DialogTitle>
          <p className="text-sm text-gray-500">{eventName}</p>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
