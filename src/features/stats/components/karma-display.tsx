import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skull } from 'lucide-react';

interface KarmaDisplayProps {
  totalKarma: number;
}

export function KarmaDisplay({ totalKarma }: KarmaDisplayProps) {
  return (
    <Card className="border-violet-500/50 bg-violet-500/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-violet-600">借金総額</CardTitle>
        <Skull className="h-4 w-4 text-violet-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-violet-700">¥{totalKarma.toLocaleString('ja-JP')}</div>
        <p className="text-text-sub text-sm">このカルマが消えることはありません...</p>
      </CardContent>
    </Card>
  );
}
