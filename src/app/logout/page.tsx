import { LogoutButton } from '@/features/auth';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ログアウト',
};

export default function LogoutPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
      <h1 className="text-2xl font-semibold text-gray-900">ログアウト</h1>
      <p className="text-gray-500">ログアウトしてもよろしいですか？</p>
      <LogoutButton />
    </div>
  );
}
