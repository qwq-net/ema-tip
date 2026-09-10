import { LoginPanel } from '@/features/auth/ui/login-panel';
import { auth } from '@/shared/config/auth';
import { redirect } from 'next/navigation';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ログイン',
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect('/mypage');
  }

  return <LoginPanel />;
}
