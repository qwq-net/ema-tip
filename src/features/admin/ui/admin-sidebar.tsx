'use client';

import { LogoutButton, ROLES, ROLE_LABELS } from '@/entities/user';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import { lookup } from '@/shared/utils/lookup';
import {
  BookOpen,
  Calendar,
  Carrot,
  ClipboardList,
  Coins,
  Download,
  ExternalLink,
  Key,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  Menu,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AdminSidebarProps {
  user: {
    name?: string | null;
    image?: string | null;
    role?: string;
  };
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  // href 配下でなくてもこの項目を選択状態にするパス。レース詳細はイベント配下の作業なのでイベント管理を光らせる
  alsoActiveUnder?: string[];
}

const NAV_GROUPS: { label?: string; role: string[]; items: NavItem[] }[] = [
  {
    role: [ROLES.ADMIN],
    items: [{ label: 'ダッシュボード', href: '/admin', icon: LayoutDashboard }],
  },
  {
    label: '運用管理',
    role: ['ADMIN'],
    items: [
      { label: 'イベント管理', href: '/admin/events', icon: Calendar, alsoActiveUnder: ['/admin/races'] },
      { label: '出馬表インポート', href: '/admin/import-race', icon: Download },
    ],
  },
  {
    label: '予想管理',
    role: [ROLES.ADMIN, ROLES.TIPSTER],
    items: [{ label: '予想入力', href: '/admin/forecasts', icon: ClipboardList }],
  },
  {
    label: 'マスタデータ',
    role: [ROLES.ADMIN],
    items: [
      { label: '競馬場管理', href: '/admin/venues', icon: MapPin },
      { label: '馬タグ管理', href: '/admin/horse-tags', icon: ClipboardList },
      { label: '馬マスタ管理', href: '/admin/horses', icon: Carrot },
      { label: 'レースマスタ管理', href: '/admin/race-definitions', icon: BookOpen },
    ],
  },
  {
    label: 'システム',
    role: [ROLES.ADMIN],
    items: [
      { label: 'ユーザー管理', href: '/admin/users', icon: Users },
      { label: 'ゲストコード管理', href: '/admin/users/guests', icon: Key },
      { label: '保証オッズ設定', href: '/admin/settings/odds', icon: Coins },
    ],
  },
];

/** パスが root そのものか、その配下かを返す。 */
function isUnder(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`);
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  // 開いたドロワーは Escape でも閉じられるようにします
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const filteredGroups = NAV_GROUPS.filter((group) => group.role.some((role) => role === user.role));

  return (
    <>
      <div className="fixed top-0 right-0 left-0 z-40 flex h-16 items-center border-b border-gray-200 bg-white px-4 md:hidden">
        <div className="flex w-full items-center justify-between">
          <div className="text-secondary flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            <span className="text-lg font-semibold">えまちっぷ Admin</span>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-control text-text-sub p-2 transition-colors hover:bg-gray-100"
            aria-label="メニューを開閉"
            aria-expanded={isOpen}
            aria-controls="admin-drawer"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <button
          type="button"
          aria-label="メニューを閉じる"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        id="admin-drawer"
        className={cn(
          'bg-secondary fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-800 text-white md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full max-md:invisible'
        )}
      >
        <div className="border-b border-gray-800 p-6">
          <div className="text-turf-400 flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            <span className="text-xl font-semibold tracking-tight text-white">えまちっぷ Admin</span>
          </div>
          <p className="mt-2 text-sm tracking-wider text-gray-400 uppercase">ema-tip admin</p>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-4 py-6">
          {filteredGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {group.label && (
                <p className="mb-2 px-4 text-sm font-semibold tracking-widest text-gray-400 uppercase">{group.label}</p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : [item.href, ...(item.alsoActiveUnder ?? [])].some((root) => isUnder(pathname, root));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'rounded-control flex items-center gap-3 px-4 py-2 text-sm font-semibold transition-colors',
                      isActive ? 'bg-white/15 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Icon className={cn('h-4.5 w-4.5', isActive ? 'opacity-100' : 'opacity-70')} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="pb-safe border-t border-gray-800 bg-black/20 p-4">
          <div className="mb-4 flex items-center gap-3">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || 'User'}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="border-turf-500/30 bg-turf-500/20 text-turf-300 flex h-8 w-8 items-center justify-center rounded-full border">
                <span className="text-sm font-semibold">{user.name?.[0] || 'A'}</span>
              </div>
            )}
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm leading-none font-semibold text-white">{user.name}</span>
              <span className="mt-1 text-sm text-gray-400">{lookup(ROLE_LABELS, user.role ?? '') ?? '管理者'}</span>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            className="mb-2 w-full border-gray-600 bg-transparent text-gray-300 hover:bg-white/10 hover:text-white"
          >
            <Link href="/mypage" onClick={() => setIsOpen(false)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              マイページ
            </Link>
          </Button>
          <LogoutButton
            className="mb-4 w-full border-gray-600 bg-transparent text-gray-300 hover:bg-white/10 hover:text-white"
            variant="outline"
          />
        </div>
      </aside>
    </>
  );
}
