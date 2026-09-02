'use client';

import { Transaction, TransactionList } from '@/entities/wallet/ui/transaction-list';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui';
import { useEffect, useState } from 'react';
import { getWalletTransactions } from '../queries';

interface TransactionHistoryDialogProps {
  walletId: string;
  eventName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WalletTransaction = Awaited<ReturnType<typeof getWalletTransactions>>[number];

export function TransactionHistoryDialog({ walletId, eventName, open, onOpenChange }: TransactionHistoryDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open && !prevOpen) {
    setPrevOpen(true);
    setIsLoading(true);
    setTransactions([]);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  useEffect(() => {
    let active = true;
    if (open) {
      getWalletTransactions(walletId)
        .then((data) => {
          if (active) {
            const mapped = data.map((tx: WalletTransaction) => {
              let description = null;
              if ((tx.type === 'BET' || tx.type === 'PAYOUT') && tx.bet5Ticket) {
                const bet5EventName = tx.bet5Ticket.bet5Event?.event?.name;
                description = bet5EventName
                  ? `${bet5EventName} BET5 ${tx.type === 'PAYOUT' ? '払戻' : '購入'}`
                  : `BET5 ${tx.type === 'PAYOUT' ? '払戻' : '購入'}`;
              } else if (tx.type === 'BET' || tx.type === 'PAYOUT' || tx.type === 'REFUND') {
                const raceName = tx.bet?.race?.name;
                const venueShortName = tx.bet?.race?.venue?.shortName;
                if (raceName) {
                  description = venueShortName ? `${venueShortName} ${raceName}` : raceName;
                }
              } else if (tx.type === 'DISTRIBUTION') {
                description = tx.event?.name || '配布金';
              } else if (tx.type === 'LOAN') {
                description = tx.event?.name ? `${tx.event.name} 借入金` : '借入金';
              }

              return {
                id: tx.id,
                amount: tx.amount,
                type: tx.type,
                description,
                createdAt: tx.createdAt,
              };
            });
            setTransactions(mapped);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          console.error(err);
          if (active) setIsLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [open, walletId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] min-h-[50vh] flex-col gap-0 p-0">
        <DialogHeader className="border-b border-gray-100 p-4">
          <DialogTitle>取引履歴</DialogTitle>
          <DialogDescription>{eventName}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
          ) : (
            <TransactionList transactions={transactions} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
