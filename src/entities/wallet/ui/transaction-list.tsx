'use client';

import { TRANSACTION_TYPE_LABELS } from '@/entities/wallet/constants';
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
  // 取得件数に上限があり、それより古い取引が省かれている可能性があるとき true。末尾に注記を出す。
  // 全件を渡す戦績ページは渡さない。件数だけで判定すると全件表示でも注記が出てしまう
  truncated?: boolean;
}

export function TransactionList({ transactions, truncated = false }: TransactionListProps) {
  if (transactions.length === 0) {
    return <div className="text-text-sub py-8 text-center">取引履歴はありません。</div>;
  }

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
              <div className={`rounded-full p-2 ${isExpense ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                {isExpense ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
              </div>
              <div>
                <div className="text-text-main font-semibold">
                  {tx.description || lookup(TRANSACTION_TYPE_LABELS, tx.type) || tx.type}
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

            <div className={`text-lg font-semibold tabular-nums ${isExpense ? 'text-red-600' : 'text-blue-600'}`}>
              {isExpense ? '' : '+'}
              {tx.amount.toLocaleString('ja-JP')}
            </div>
          </div>
        );
      })}
      {truncated && <div className="text-text-sub py-2 text-center text-sm">直近200件のみ表示しています</div>}
    </div>
  );
}
