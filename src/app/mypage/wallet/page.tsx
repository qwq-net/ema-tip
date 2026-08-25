import { WalletOverview, getEventWallets } from '@/features/economy/wallet';
import { requireLoginPage } from '@/shared/utils/admin';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ウォレット確認',
};

export default async function WalletPage() {
  await requireLoginPage();

  const userWallets = await getEventWallets();

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

        <div>
          <h1 className="text-3xl font-semibold text-gray-900">ウォレット確認</h1>
          <p className="mt-2 text-gray-500">参加中のイベント資金と利用履歴を確認できます。</p>
        </div>

        <section>
          <WalletOverview wallets={userWallets} />
        </section>
      </div>
    </div>
  );
}
