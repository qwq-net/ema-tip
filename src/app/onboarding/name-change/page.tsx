import { NameChangePanel } from '@/features/user/ui/name-change-panel';
import { requireLoginPage } from '@/shared/utils/admin';
import { redirect } from 'next/navigation';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プロフィール設定',
};

export default async function OnboardingNameChangePage() {
  const session = await requireLoginPage();

  if (session.user.isOnboardingCompleted) {
    redirect('/mypage');
  }

  return <NameChangePanel initialName={session.user.name || ''} />;
}
