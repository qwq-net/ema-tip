'use client';

import { TransactionList } from '@/entities/wallet/ui/transaction-list';
import { AssetChart } from '@/features/stats/components/asset-chart';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { cn } from '@/shared/utils/cn';
import { ChevronDown } from 'lucide-react';
import { EventStats } from '../utils';

interface EventStatsCardProps {
  event: EventStats;
}

export function EventStatsCard({ event }: EventStatsCardProps) {
  return (
    <Collapsible className="group">
      <Card>
        <CollapsibleTrigger asChild>
          <div className="flex cursor-pointer items-center p-4 hover:bg-gray-50/50">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{event.name}</h3>
                {event.loan > 0 && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-sm font-semibold text-orange-700">
                    借入あり
                  </span>
                )}
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  所持金: <span className="font-medium">¥{event.balance.toLocaleString('ja-JP')}</span>
                </div>
                <div className={cn(event.net >= 0 ? 'text-blue-600' : 'text-red-600')}>
                  収支:{' '}
                  <span className="font-medium">
                    {event.net > 0 && '+'}
                    {event.net.toLocaleString('ja-JP')}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              <span className="sr-only">詳細を開く</span>
            </Button>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4 border-t border-gray-100 px-4 py-4">
            {event.loan > 0 && (
              <div className="space-y-1">
                <span className="text-text-sub text-sm">借入総額</span>
                <div className="text-error text-lg font-semibold tabular-nums">
                  ¥{event.loan.toLocaleString('ja-JP')}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-text-sub text-sm font-medium">資産推移</h4>
              <AssetChart data={event.history} title="" />
            </div>

            <div className="space-y-2">
              <h4 className="text-text-sub text-sm font-medium">取引履歴</h4>
              <div className="max-h-[320px] overflow-y-auto">
                <TransactionList transactions={event.logs} />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
