import { WalletOverview, getEventWallets } from '@/features/economy/wallet';
import { PageContainer } from '@/shared/ui/layout/page-container';
import { requireLoginPage } from '@/shared/utils/admin';

import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ウォレット確認',
};

export default async function WalletPage() {
  await requireLoginPage();

  const userWallets = await getEventWallets();

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'マイページ', href: '/mypage' }, { label: 'ウォレット確認' }]} />

      <div>
        <h1 className="text-text-main text-3xl font-semibold">ウォレット確認</h1>
        <p className="text-text-sub mt-2">参加中のイベント資金と利用履歴を確認できます。</p>
      </div>

      <section>
        <WalletOverview wallets={userWallets} />
      </section>
    </PageContainer>
  );
}
