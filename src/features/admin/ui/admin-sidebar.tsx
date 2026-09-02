'use client';

import { ROLES, ROLE_LABELS } from '@/entities/user';
import { LogoutButton } from '@/features/auth';
import { cn } from '@/shared/utils/cn';
import { lookup } from '@/shared/utils/lookup';
import {
  BookOpen,
  Calendar,
  Carrot,
  ClipboardList,
  Coins,
  Crown,
  Download,
  ExternalLink,
  Key,
  LayoutDashboard,
  MapPin,
  Menu,
  Ticket,
  Trophy,
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

const NAV_GROUPS = [
  {
    role: [ROLES.ADMIN],
    items: [{ label: 'ダッシュボード', href: '/admin', icon: LayoutDashboard }],
  },
  {
    label: '運用管理',
    role: ['ADMIN'],
    items: [
      { label: 'イベント管理', href: '/admin/events', icon: Calendar },
      { label: 'レース管理', href: '/admin/races', icon: Trophy },
      { label: '出走馬管理', href: '/admin/entries', icon: ClipboardList },
      { label: 'BET5管理', href: '/admin/bet5', icon: Crown },
      { label: '馬券管理', href: '/admin/bets', icon: Ticket },
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
      { label: '保証オッズ設定', href: '/admin/settings/odds', icon: Coins },
    ],
  },
  {
    label: 'システム',
    role: [ROLES.ADMIN],
    items: [
      { label: 'ユーザー管理', href: '/admin/users', icon: Users },
      { label: 'ゲストコード管理', href: '/admin/users/guests', icon: Key },
    ],
  },
];

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

  const filteredGroups = NAV_GROUPS.filter(
    (group) => !group.role || (user.role && group.role.some((role) => role === user.role))
  );

  return (
    <>
      <div className="fixed top-0 right-0 left-0 z-40 border-b border-gray-200 bg-white p-4 md:hidden">
        <div className="flex items-center justify-between">
          <div className="text-secondary flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            <span className="text-lg font-semibold">Paper Tipster Admin</span>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="メニューを開閉"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={cn(
          'bg-secondary fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-800 text-white md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="border-b border-gray-800 p-6">
          <div className="text-primary flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            <h1 className="text-xl font-semibold tracking-tight text-white">PT Admin</h1>
          </div>
          <p className="mt-2 text-sm font-medium tracking-wider text-gray-400 uppercase">Paper Tipster Admin</p>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-4 py-6">
          {filteredGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {group.label && (
                <p className="mb-2 px-4 text-sm font-semibold tracking-widest text-gray-500 uppercase">{group.label}</p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-white/15 text-white shadow-sm' : 'text-gray-300 hover:bg-white/10 hover:text-white'
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
              <div className="bg-primary/20 text-primary border-primary/30 flex h-8 w-8 items-center justify-center rounded-full border">
                <span className="text-sm font-semibold">{user.name?.[0] || 'A'}</span>
              </div>
            )}
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm leading-none font-semibold text-white">{user.name}</span>
              <span className="mt-1 text-sm text-gray-400">{lookup(ROLE_LABELS, user.role ?? '') ?? '管理者'}</span>
            </div>
          </div>
          <Link
            href="/mypage"
            onClick={() => setIsOpen(false)}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-md border border-gray-600 bg-transparent px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
            マイページ
          </Link>
          <LogoutButton
            className="mb-4 w-full border-gray-600 bg-transparent text-gray-300 hover:bg-white/10 hover:text-white"
            variant="outline"
          />
        </div>
      </aside>
    </>
  );
}
