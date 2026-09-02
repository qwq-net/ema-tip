import { NameChangeForm } from '@/features/user/ui/name-change-form';
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="rounded-surface w-full max-w-md space-y-8 border border-gray-200 bg-white p-8">
        <div className="text-center">
          <h1 className="text-primary text-2xl font-semibold tracking-tight">Welcome to Paper Tipster</h1>
          <p className="mt-2 text-sm text-gray-500">
            はじめに、ユーザー名を設定してください。
            <br />
            この名前は後から変更可能です。
          </p>
        </div>
        <div className="flex flex-col items-center">
          <NameChangeForm initialName={session.user.name || ''} />
        </div>
      </div>
    </div>
  );
}
