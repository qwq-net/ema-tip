import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { cn } from '@/shared/utils/cn';
import { Wallet } from 'lucide-react';

interface CurrentBalanceDisplayProps {
  amount: number;
}

export function CurrentBalanceDisplay({ amount }: CurrentBalanceDisplayProps) {
  return (
    <Card className="border-turf-500/50 bg-turf-500/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-turf-800 text-sm font-medium">総所持金</CardTitle>
        <Wallet className="text-turf-800 h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-semibold', amount < 0 ? 'text-red-600' : 'text-turf-800')}>
          ¥{amount.toLocaleString('ja-JP')}
        </div>
        <p className="text-text-sub text-sm">全イベントの合計所持金</p>
      </CardContent>
    </Card>
  );
}
