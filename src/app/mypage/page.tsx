import { MypageHome } from '@/features/user/ui/mypage-home';
import { PageContainer } from '@/shared/ui/layout/page-container';
import { requireLoginPage } from '@/shared/utils/admin';
import { redirect } from 'next/navigation';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'マイページ',
};

export default async function MyPage() {
  const session = await requireLoginPage();

  if (!session.user.isOnboardingCompleted) {
    redirect('/onboarding/name-change');
  }

  return (
    <PageContainer>
      <MypageHome user={session.user} />
    </PageContainer>
  );
}
