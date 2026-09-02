'use client';

import { Button, Card, CardContent } from '@/shared/ui';
import { Info } from 'lucide-react';
import Link from 'next/link';

interface WalletMissingCardProps {
  description?: string;
  showBackLink?: boolean;
}

export function WalletMissingCard({
  description = '馬券を購入するには、まずマイページからイベントに参加して資金を受け取ってください。',
  showBackLink = false,
}: WalletMissingCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <Info className="text-turf-600 mx-auto mb-4 h-12 w-12" />
          <h2 className="mb-2 text-xl font-semibold">ウォレットが見つかりません</h2>
          <p className="text-gray-500">{description}</p>
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/mypage/claim">お小遣いを貰いに行く</Link>
            </Button>
            {showBackLink && (
              <Link href="/mypage/sokubet" className="text-text-sub text-sm hover:underline">
                即BETトップへ戻る
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
