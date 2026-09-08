'use client';

import { formatSignedYen, resultDiffClass } from '@/entities/ranking';
import { TransactionList } from '@/entities/wallet/ui/transaction-list';
import { AssetChart } from '@/features/stats/components/asset-chart';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { formatYen } from '@/shared/utils/format-yen';
import { ChevronDown } from 'lucide-react';
import type { EventStats } from '../utils';

interface EventStatsCardProps {
  event: EventStats;
}

export function EventStatsCard({ event }: EventStatsCardProps) {
  return (
    <Collapsible className="group">
      <Card>
        <h3>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center p-4 text-left hover:bg-gray-50/50">
              <span className="flex flex-1 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{event.name}</span>
                  {event.loan > 0 && <Badge label="借入あり" className="bg-orange-100 text-orange-700" />}
                </span>
                <span className="flex gap-4 text-sm">
                  <span>
                    所持金: <span className="font-semibold tabular-nums">{formatYen(event.balance)}</span>
                  </span>
                  <span className={resultDiffClass(event.net)}>
                    収支: <span className="font-semibold tabular-nums">{formatSignedYen(event.net)}</span>
                  </span>
                </span>
              </span>
              <span className="text-text-sub inline-flex h-10 w-10 shrink-0 items-center justify-center">
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </span>
            </button>
          </CollapsibleTrigger>
        </h3>

        <CollapsibleContent>
          <div className="space-y-4 border-t border-gray-100 px-4 py-4">
            {event.loan > 0 && (
              <div className="space-y-1">
                <span className="text-text-sub text-sm">借入総額</span>
                <div className="text-error text-lg font-semibold tabular-nums">{formatYen(event.loan)}</div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-text-sub text-sm">資産推移</h4>
              <AssetChart data={event.history} />
            </div>

            <div className="space-y-2">
              <h4 className="text-text-sub text-sm">取引履歴</h4>
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
