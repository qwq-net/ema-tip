import { LoginButton } from '@/features/auth/ui/login-button';
import { TermsAgreement } from '@/features/auth/ui/terms-agreement';
import { LogoMark } from '@/shared/ui';
import { PageHeader } from '@/shared/ui/layout/page-header';
import { CircleHelp } from 'lucide-react';

/**
 * ログイン画面の本体。サービス名と Discord ログインと規約同意の案内を 1 枚のカードに収める。
 * ログイン済みの振り分けはページ側が済ませている前提で、この部品は表示だけを持つ。
 */
export function LoginPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-surface w-full max-w-md space-y-6 border border-gray-200 bg-white p-6">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LogoMark size={56} />
          <PageHeader title="えまちっぷ" description="オンライン馬券投票ごっこシステム" />
        </div>
        <LoginButton />

        <div className="mt-8 flex flex-col items-center">
          <TermsAgreement />
        </div>

        <div className="rounded-control mt-8 border border-gray-200 bg-gray-50/50 p-4">
          <div className="flex flex-col gap-2">
            <p className="text-primary flex items-center gap-2 text-sm font-semibold">
              <CircleHelp className="h-4 w-4 shrink-0" aria-hidden="true" />
              Discord ログインで使用する権限について
            </p>
            <div className="text-sm text-gray-600">
              <p>
                ユーザーID・ユーザー名・アバター画像の基本的なプロフィール情報のみを取得し、それ以外の事は出来ない権限を使用します。
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 text-center">
          <a href="/login/guest" className="text-primary hover:text-primary/80 text-sm hover:underline">
            ゲストログインページへ
          </a>
        </div>
      </div>
    </div>
  );
}
