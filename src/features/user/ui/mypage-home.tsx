import { LogoutButton } from '@/entities/user';
import { EditableUserProfile } from '@/features/user/ui/editable-user-profile';
import { Button, Card, CardContent, CardTitle } from '@/shared/ui';
import { PageHeader } from '@/shared/ui/layout/page-header';
import type { AuthedSession } from '@/shared/utils/admin';
import type { LucideIcon } from 'lucide-react';
import { Coins, History, Wallet, Zap } from 'lucide-react';
import Link from 'next/link';

/** マイページの入口タイル。href ごとに 1 枚のカードを描き、並び順はこの配列が持つ。 */
const NAV_ITEMS: { href: string; title: string; description: string; icon: LucideIcon }[] = [
  {
    href: '/mypage/sokubet',
    title: '即BET',
    description: '開催中のレースへ投票（馬券購入）',
    icon: Zap,
  },
  {
    href: '/mypage/stats',
    title: '過去の戦績確認',
    description: 'これまでの的中実績や回収率',
    icon: History,
  },
  {
    href: '/mypage/wallet',
    title: 'ウォレット確認',
    description: '所持金と取引履歴の確認',
    icon: Wallet,
  },
  {
    href: '/mypage/claim',
    title: 'お小遣いを貰う',
    description: 'イベントに参加して資金をチャージ',
    icon: Coins,
  },
];

/**
 * マイページの本体。プロフィールの編集とログアウト、各機能への入口タイルを並べる。
 * 管理者にだけ管理者パネルへのリンクを足す。オンボーディング未完了の振り分けはページ側が済ませている前提。
 */
export function MypageHome({ user }: { user: AuthedSession['user'] }) {
  return (
    <>
      <PageHeader title="マイページ" />

      <Card>
        <CardContent className="flex flex-col items-center justify-between gap-4 p-6 md:flex-row">
          <EditableUserProfile user={user} />
          <div className="flex shrink-0 items-center gap-4">
            {user.role === 'ADMIN' && (
              <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/5">
                <Link href="/admin">管理者パネル</Link>
              </Button>
            )}
            <LogoutButton />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {NAV_ITEMS.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group h-full">
            <Card className="hover:border-turf-400 h-full transition active:scale-[0.98]">
              <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                <div className="bg-turf-100 text-turf-800 rounded-surface mb-6 flex h-20 w-20 items-center justify-center">
                  <Icon size={32} />
                </div>
                <CardTitle as="h2" className="text-2xl leading-tight">
                  {title}
                </CardTitle>
                <p className="text-text-sub mt-3 text-sm">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
