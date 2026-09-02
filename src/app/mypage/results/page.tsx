import { Card, CardContent } from '@/shared/ui';
import { requireLoginPage } from '@/shared/utils/admin';
import { ChevronLeft, Trophy } from 'lucide-react';
import Link from 'next/link';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '過去の戦績確認',
};

export default async function ResultsPage() {
  await requireLoginPage();

  return (
    <div className="flex flex-col items-center p-4 lg:p-8">
      <div className="w-full max-w-5xl space-y-8">
        <div className="flex items-center gap-4">
          <Link
            href="/mypage"
            className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft size={16} />
            マイページへ戻る
          </Link>
        </div>

        <div className="text-center md:text-left">
          <h1 className="text-3xl font-semibold text-gray-900">過去の戦績確認</h1>
          <p className="mt-2 text-gray-500">これまでの的中実績や回収率を確認できます。</p>
        </div>

        <Card className="py-20">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-6 text-gray-300">
              <Trophy size={48} />
            </div>
            <p className="text-text-sub text-xl font-semibold">現在、戦績の集計機能は準備中です</p>
            <p className="text-text-sub mt-2 text-sm">今後のアップデートをお楽しみに！</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
