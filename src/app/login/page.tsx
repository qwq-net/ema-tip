import { LoginButton, TermsAgreement } from '@/features/auth';
import { auth } from '@/shared/config/auth';
import { CircleHelp } from 'lucide-react';
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

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-surface w-full max-w-md space-y-6 border border-gray-200 bg-white p-6">
        <div className="text-center">
          <div className="mb-4">
            <h1 className="text-primary text-2xl font-semibold tracking-tight">Paper Tipster</h1>
            <p className={`text-center text-sm text-gray-500`}>オンライン馬券投票ごっこシステム</p>
          </div>
          <LoginButton />
        </div>

        <div className="mt-8 flex flex-col items-center">
          <TermsAgreement />
        </div>

        <div className="rounded-control mt-8 border border-gray-200 bg-gray-50/50 p-4">
          <div className="flex flex-col gap-2">
            <div className="text-primary flex items-center gap-2">
              <CircleHelp className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Discord ログインで使用する権限について</h3>
            </div>
            <div className="text-sm text-gray-600">
              <p>
                ユーザーID、ユーザー名、アバター画像などの基本的なプロフィール情報のみを取得し、それ以外の情報にはアクセス出来ない権限を使用します。
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 text-center">
          <a href="/login/guest" className="text-primary hover:text-primary/80 text-sm font-medium hover:underline">
            ゲストログインページへ
          </a>
        </div>
      </div>
    </div>
  );
}
