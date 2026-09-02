import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skull } from 'lucide-react';

interface KarmaDisplayProps {
  totalKarma: number;
}

export function KarmaDisplay({ totalKarma }: KarmaDisplayProps) {
  return (
    <Card className="border-error/40 bg-error/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-error text-sm font-medium">借金総額</CardTitle>
        <Skull className="text-error h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-error text-2xl font-semibold">¥{totalKarma.toLocaleString('ja-JP')}</div>
        <p className="text-text-sub text-sm">このカルマが消えることはありません...</p>
      </CardContent>
    </Card>
  );
}
