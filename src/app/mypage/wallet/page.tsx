import { WalletOverview, getEventWallets } from '@/features/economy/wallet';
import { PageContainer } from '@/shared/ui/layout/page-container';
import { PageHeader } from '@/shared/ui/layout/page-header';
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
      <PageHeader title="ウォレット確認" description="参加中のイベント資金と利用履歴を確認できます。" />
      <WalletOverview wallets={userWallets} />
    </PageContainer>
  );
}
