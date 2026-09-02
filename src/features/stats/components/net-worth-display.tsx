import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { cn } from '@/shared/utils/cn';
import { TrendingUp } from 'lucide-react';

interface NetWorthDisplayProps {
  amount: number;
}

export function NetWorthDisplay({ amount }: NetWorthDisplayProps) {
  const isPositive = amount >= 0;

  return (
    <Card className={cn(isPositive ? 'border-blue-500/50 bg-blue-500/5' : 'border-red-500/50 bg-red-500/5')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn('text-sm font-medium', isPositive ? 'text-blue-700' : 'text-red-700')}>
          純資産
        </CardTitle>
        <TrendingUp className={cn('h-4 w-4', isPositive ? 'text-blue-700' : 'text-red-700')} />
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-semibold', isPositive ? 'text-blue-700' : 'text-red-700')}>
          ¥{amount.toLocaleString('ja-JP')}
        </div>
        <p className="text-text-sub text-sm">資産 - 借金</p>
      </CardContent>
    </Card>
  );
}
