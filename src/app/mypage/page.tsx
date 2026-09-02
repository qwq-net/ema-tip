import { LogoutButton } from '@/features/auth';
import { EditableUserProfile } from '@/features/user/ui/editable-user-profile';
import { Button, Card, CardContent } from '@/shared/ui';
import { requireLoginPage } from '@/shared/utils/admin';
import { Coins, History, Wallet, Zap } from 'lucide-react';
import Link from 'next/link';
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

  const navItems = [
    {
      href: '/mypage/sokubet',
      title: '即BET',
      description: '開催中のレースへ投票（馬券購入）',
      icon: <Zap size={32} />,
      color: 'bg-turf-100 text-turf-800',
    },
    {
      href: '/stats',
      title: '過去の戦績確認',
      description: 'これまでの的中実績や回収率',
      icon: <History size={32} />,
      color: 'bg-turf-100 text-turf-800',
    },
    {
      href: '/mypage/wallet',
      title: 'ウォレット確認',
      description: '所持金と取引履歴の確認',
      icon: <Wallet size={32} />,
      color: 'bg-turf-100 text-turf-800',
    },
    {
      href: '/mypage/claim',
      title: 'お小遣いを貰う',
      description: 'イベントに参加して資金をチャージ',
      icon: <Coins size={32} />,
      color: 'bg-turf-100 text-turf-800',
    },
  ];

  return (
    <div className="flex flex-col items-center p-4 lg:p-8">
      <div className="w-full max-w-5xl space-y-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-between gap-4 p-6 md:flex-row">
            <EditableUserProfile user={session.user} />
            <div className="flex shrink-0 items-center gap-4">
              {session.user.role === 'ADMIN' && (
                <Button
                  asChild
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5 font-semibold"
                >
                  <Link href="/admin">管理者パネル</Link>
                </Button>
              )}
              <LogoutButton />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="group h-full">
              <Card className="hover:border-turf-400 h-full transition active:scale-[0.98]">
                <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                  <div className={`rounded-surface mb-6 flex h-20 w-20 items-center justify-center ${item.color}`}>
                    {item.icon}
                  </div>
                  <h3 className="text-2xl leading-tight font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-text-sub mt-3 text-sm font-semibold">{item.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
