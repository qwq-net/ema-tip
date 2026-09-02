'use client';

import { Card } from '@/shared/ui';
import { History, Wallet } from 'lucide-react';
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
    return <Card className="p-8 text-center text-gray-500">参加中のイベントやウォレットが見つかりませんでした。</Card>;
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
              <h3 className="line-clamp-1 font-semibold text-gray-900" title={wallet.event.name}>
                {wallet.event.name}
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-secondary text-2xl font-semibold">{wallet.balance.toLocaleString('ja-JP')}</span>
                <span className="text-sm font-semibold text-gray-500">円</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end border-t pt-4">
              <button
                onClick={() => setSelectedWallet({ id: wallet.id, name: wallet.event.name })}
                className="hover:text-primary text-text-sub flex items-center gap-1.5 text-sm font-semibold transition-colors"
              >
                <History size={14} />
                履歴を見る
              </button>
            </div>
          </Card>
        ))}
      </div>

      {selectedWallet && (
        <TransactionHistoryDialog
          walletId={selectedWallet.id}
          eventName={selectedWallet.name}
          open={!!selectedWallet}
          onOpenChange={(open) => !open && setSelectedWallet(null)}
        />
      )}
    </>
  );
}
