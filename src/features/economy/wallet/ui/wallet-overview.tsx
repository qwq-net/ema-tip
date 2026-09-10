'use client';

import { Button, Card, CardTitle, EmptyState } from '@/shared/ui';
import { History, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { TransactionHistoryDialog } from './transaction-history-dialog';

interface EventWallet {
  id: string;
  balance: number;
  eventId: string;
  event: {
    name: string;
    date: string;
  };
}

interface WalletOverviewProps {
  wallets: EventWallet[];
}

export function WalletOverview({ wallets }: WalletOverviewProps) {
  const [selectedWallet, setSelectedWallet] = useState<{ id: string; name: string } | null>(null);

  if (wallets.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="参加中のイベントがありません"
        description="イベントに参加すると軍資金が配られ、ここに残高が表示されます。"
        action={
          <Button asChild variant="outline">
            <Link href="/mypage/claim">お小遣いを貰う</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {wallets.map((wallet) => (
          <Card key={wallet.id} className="p-6 transition">
            <div className="mb-4 flex items-start justify-between">
              <div className="bg-primary/10 text-primary rounded-full p-2">
                <Wallet size={20} />
              </div>
              <span className="text-text-sub text-sm">{wallet.event.date}</span>
            </div>

            <div className="space-y-1">
              <CardTitle as="h2" className="line-clamp-1" title={wallet.event.name}>
                {wallet.event.name}
              </CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-secondary text-2xl font-semibold">{wallet.balance.toLocaleString('ja-JP')}</span>
                <span className="text-text-sub text-sm">円</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end border-t border-gray-100 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedWallet({ id: wallet.id, name: wallet.event.name })}
                className="hover:text-primary text-text-sub gap-1.5 px-0 hover:bg-transparent"
              >
                <History />
                履歴を見る
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {selectedWallet && (
        <TransactionHistoryDialog
          walletId={selectedWallet.id}
          eventName={selectedWallet.name}
          open={Boolean(selectedWallet)}
          onOpenChange={(open) => !open && setSelectedWallet(null)}
        />
      )}
    </>
  );
}
