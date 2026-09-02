'use client';

import { cn } from '@/shared/utils/cn';
import Link from 'next/link';

interface GuestAuthTabsProps {
  activeTab: 'signup' | 'login';
}

export function GuestAuthTabs({ activeTab }: GuestAuthTabsProps) {
  return (
    <div className="rounded-control mb-6 grid grid-cols-2 gap-2 bg-gray-100 p-1.5">
      <Link
        href="/signup/guest"
        className={cn(
          'rounded-control flex items-center justify-center px-4 py-2.5 text-sm font-semibold transition',
          activeTab === 'signup'
            ? 'bg-white text-gray-900'
            : 'bg-transparent text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
        )}
      >
        招待コード登録
      </Link>
      <Link
        href="/login/guest"
        className={cn(
          'rounded-control flex items-center justify-center px-4 py-2.5 text-sm font-semibold transition',
          activeTab === 'login'
            ? 'bg-white text-gray-900'
            : 'bg-transparent text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
        )}
      >
        招待コードログイン
      </Link>
    </div>
  );
}
