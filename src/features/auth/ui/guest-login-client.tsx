'use client';

import { checkIpLockStatus } from '@/features/auth/actions/auth-actions';
import { getAuthErrorMessage, LOGIN_ERROR_MESSAGES } from '@/features/auth/lib/error-messages';
import { useEmojiPassword } from '@/features/auth/lib/use-emoji-password';
import { EmojiKeypad } from '@/features/auth/ui/emoji-keypad';
import { GuestAuthTabs } from '@/features/auth/ui/guest-auth-tabs';
import { TermsAgreement } from '@/features/auth/ui/terms-agreement';
import { Alert } from '@/shared/ui';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/forms';
import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function GuestLoginClient() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const { password, setPassword, handleEmojiClick, handleBackspace, handleClear } = useEmojiPassword();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('すべての項目を入力してください');
      return;
    }

    if ([...password].length < 3) {
      setError('絵文字パスワードは3文字以上で入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    const ipLockStatus = await checkIpLockStatus();
    if (ipLockStatus.isLocked) {
      setIsLoading(false);
      setError(`アクセスが制限されています。解除まであと約${ipLockStatus.remainingMinutes}分です。`);
      return;
    }

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      const postIpLockStatus = await checkIpLockStatus();

      setIsLoading(false);
      if (postIpLockStatus.isLocked) {
        setError(
          `試行回数制限を超えました。一定時間アクセスを制限します。（解除まであと約${postIpLockStatus.remainingMinutes}分）`
        );
      } else {
        setError(
          getAuthErrorMessage(result.error, LOGIN_ERROR_MESSAGES, 'ログインエラーが発生しました: ' + result.error)
        );
      }
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-4">
        <div>
          <Link
            href="/login"
            className="flex w-fit items-center text-sm text-gray-500 transition-colors hover:text-gray-900 hover:underline"
          >
            <span>←</span>
            <span className="ml-1">通常ログインに戻る</span>
          </Link>
        </div>

        <div className="rounded-surface space-y-6 border border-gray-200 bg-white p-6">
          <GuestAuthTabs activeTab="login" />

          <div className="text-center">
            <h2 className="text-primary text-xl font-semibold tracking-tight">招待コードログイン</h2>
            <p className="mt-2 text-sm text-gray-500">ユーザー名と絵文字パスワードを入力</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="hidden">
              <input type="hidden" name="code" value="" />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                ユーザー名
                <span className="ml-2 text-sm font-normal text-gray-500">（英数字、ひらがな、カタカナ、漢字）</span>
              </label>
              <div className="mt-1">
                <Input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="表示名を入力"
                  ignorePasswordManager={false}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                絵文字パスワード
                <span className="ml-2 text-sm font-normal text-gray-500">（3〜6文字）</span>
              </label>

              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                ignorePasswordManager={false}
              />

              <div className="rounded-control mb-4 flex min-h-[50px] items-center justify-center border border-gray-200 bg-gray-100 p-3 text-center text-xl tracking-widest">
                {password || <span className="text-text-sub text-xl font-normal tracking-normal">絵文字を選択</span>}
              </div>

              <EmojiKeypad onEmojiClick={handleEmojiClick} onBackspace={handleBackspace} onClear={handleClear} />
            </div>

            {error && (
              <Alert variant="error" className="flex-col items-start gap-1 p-4">
                <h3 className="font-semibold">ログインエラー</h3>
                <p className="font-normal">{error}</p>
              </Alert>
            )}

            <div>
              <TermsAgreement className="mb-4" />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 -ml-1 h-4 w-4 animate-spin" />}
                {isLoading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
