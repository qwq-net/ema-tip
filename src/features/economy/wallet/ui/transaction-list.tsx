'use client';

import { FormattedDate } from '@/shared/ui/formatted-date';
import { lookup } from '@/shared/utils/lookup';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: Date;
}

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return <div className="text-text-sub py-8 text-center">取引履歴はありません。</div>;
  }

  // キーは transactionTypeEnum の値に一致させること
  const typeLabels = {
    DISTRIBUTION: '配布金',
    BET: '投票',
    PAYOUT: '払戻',
    REFUND: '払戻',
    ADJUSTMENT: '調整',
    LOAN: '借入金',
  } satisfies Record<string, string>;

  return (
    <div className="space-y-3">
      {transactions.map((tx) => {
        const isExpense = tx.amount < 0;
        return (
          <div
            key={tx.id}
            className="rounded-control flex items-center justify-between border border-gray-100 bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className={`rounded-full p-2 ${isExpense ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}
              >
                {isExpense ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {tx.description || lookup(typeLabels, tx.type) || tx.type}
                </div>
                <div className="text-text-sub text-sm">
                  <FormattedDate
                    date={tx.createdAt}
                    options={{
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }}
                  />
                </div>
              </div>
            </div>

            <div className={`text-lg font-semibold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
              {isExpense ? '' : '+'}
              {tx.amount.toLocaleString('ja-JP')}
            </div>
          </div>
        );
      })}
      {transactions.length >= 200 && (
        <div className="text-text-sub py-2 text-center text-sm">直近200件のみ表示しています</div>
      )}
    </div>
  );
}
