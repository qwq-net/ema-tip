'use client';

import type { Transaction } from '@/entities/wallet/ui/transaction-list';
import { TransactionList } from '@/entities/wallet/ui/transaction-list';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui';
import { useEffect, useState } from 'react';
import { getWalletTransactions } from '../queries';
import { describeTransaction } from './describe-transaction';

interface TransactionHistoryDialogProps {
  walletId: string;
  eventName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
            const mapped = data.map((tx) => ({
              id: tx.id,
              amount: tx.amount,
              type: tx.type,
              description: describeTransaction(tx),
              createdAt: tx.createdAt,
            }));
            setTransactions(mapped);
            setIsLoading(false);
          }
        })
        .catch((cause: unknown) => {
          console.error(cause);
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
