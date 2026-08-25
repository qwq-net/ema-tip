import { Card, CardContent, CardHeader } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Carrot,
  ClipboardList,
  Coins,
  Crown,
  Key,
  MapPin,
  Ticket,
  Trophy,
  Users,
} from 'lucide-react';
import Link from 'next/link';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '管理者ダッシュボード',
};

const COLOR_VARIANTS = {
  primary: {
    qaBg: 'bg-primary/10',
    qaText: 'text-primary',
    qaHoverBg: 'group-hover:bg-primary',
    qaHoverText: 'group-hover:text-primary',
  },
  amber: {
    qaBg: 'bg-amber-100',
    qaText: 'text-amber-600',
    qaHoverBg: 'group-hover:bg-amber-600',
    qaHoverText: 'group-hover:text-amber-600',
  },
  purple: {
    qaBg: 'bg-purple-100',
    qaText: 'text-purple-600',
    qaHoverBg: 'group-hover:bg-purple-600',
    qaHoverText: 'group-hover:text-purple-600',
  },
  indigo: {
    qaBg: 'bg-indigo-100',
    qaText: 'text-indigo-600',
    qaHoverBg: 'group-hover:bg-indigo-600',
    qaHoverText: 'group-hover:text-indigo-600',
  },
  slate: {
    qaBg: 'bg-slate-100',
    qaText: 'text-slate-600',
    qaHoverBg: 'group-hover:bg-slate-600',
    qaHoverText: 'group-hover:text-slate-600',
  },
  emerald: {
    qaBg: 'bg-emerald-100',
    qaText: 'text-emerald-600',
    qaHoverBg: 'group-hover:bg-emerald-600',
    qaHoverText: 'group-hover:text-emerald-600',
  },
  rose: {
    qaBg: 'bg-rose-100',
    qaText: 'text-rose-600',
    qaHoverBg: 'group-hover:bg-rose-600',
    qaHoverText: 'group-hover:text-rose-600',
  },
  teal: {
    qaBg: 'bg-teal-100',
    qaText: 'text-teal-600',
    qaHoverBg: 'group-hover:bg-teal-600',
    qaHoverText: 'group-hover:text-teal-600',
  },
  sky: {
    qaBg: 'bg-sky-100',
    qaText: 'text-sky-600',
    qaHoverBg: 'group-hover:bg-sky-600',
    qaHoverText: 'group-hover:text-sky-600',
  },
  cyan: {
    qaBg: 'bg-cyan-100',
    qaText: 'text-cyan-600',
    qaHoverBg: 'group-hover:bg-cyan-600',
    qaHoverText: 'group-hover:text-cyan-600',
  },
} as const;

type ColorVariant = keyof typeof COLOR_VARIANTS;

const OPERATION_ACTIONS = [
  {
    href: '/admin/events',
    icon: Calendar,
    label: 'イベント管理',
    description: 'イベントの追加・編集・確定処理',
    color: 'indigo',
  },
  {
    href: '/admin/races',
    icon: Trophy,
    label: 'レース管理',
    description: 'レースの作成・管理',
    color: 'purple',
  },
  {
    href: '/admin/entries',
    icon: ClipboardList,
    label: '出走馬管理',
    description: 'レースへの競走馬の割り当て',
    color: 'emerald',
  },
  {
    href: '/admin/bet5',
    icon: Crown,
    label: 'BET5管理',
    description: 'BET5イベントの作成・結果確定',
    color: 'rose',
  },
  {
    href: '/admin/bets',
    icon: Ticket,
    label: '馬券管理',
    description: '購入された馬券の確認と管理',
    color: 'cyan',
  },
] as const;

const MASTER_ACTIONS = [
  {
    href: '/admin/venues',
    icon: MapPin,
    label: '競馬場管理',
    description: '競馬場の場所・設定',
    color: 'slate',
  },
  {
    href: '/admin/horse-tags',
    icon: ClipboardList,
    label: '馬タグ管理',
    description: '脚質・特性マスタ',
    color: 'teal',
  },
  {
    href: '/admin/horses',
    icon: Carrot,
    label: '馬マスタ管理',
    description: '競走馬の管理',
    color: 'amber',
  },
  {
    href: '/admin/race-definitions',
    icon: BookOpen,
    label: 'レースマスタ管理',
    description: '重賞名・条件マスタ',
    color: 'primary',
  },
  {
    href: '/admin/settings/odds',
    icon: Coins,
    label: '保証オッズ設定',
    description: 'デフォルト保証オッズ',
    color: 'amber',
  },
] as const;

const SYSTEM_ACTIONS = [
  {
    href: '/admin/users',
    icon: Users,
    label: 'ユーザー管理',
    description: 'ユーザー確認・権限変更',
    color: 'sky',
  },
  {
    href: '/admin/users/guests',
    icon: Key,
    label: 'ゲストコード管理',
    description: 'ログインコードの管理',
    color: 'slate',
  },
] as const;

export default async function AdminPage() {
  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">ダッシュボード</h1>
      </div>

      <Card className="border-indigo-100 bg-indigo-50/50 shadow-sm transition-all hover:bg-indigo-50">
        <CardContent className="flex flex-col items-center justify-between gap-4 p-6 md:flex-row">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-secondary font-semibold">管理者向けクイックガイド</h2>
              <p className="max-w-md text-sm text-gray-600">
                マスタの登録からイベント開催までの流れをステップ形式で解説します。
              </p>
            </div>
          </div>
          <Link
            href="/admin/guide"
            className="text-primary flex shrink-0 items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-gray-200 transition-all hover:bg-gray-50 active:scale-95"
          >
            使い方を見る
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <h2 className="text-secondary text-xl font-semibold">運用管理</h2>
          </CardHeader>
          <CardContent className="grid flex-1 grid-cols-1 gap-4">
            {OPERATION_ACTIONS.map((action) => {
              const colors = COLOR_VARIANTS[action.color as ColorVariant];
              return <ActionLink key={action.href} action={action} colors={colors} />;
            })}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <h2 className="text-secondary text-xl font-semibold">マスタデータ</h2>
          </CardHeader>
          <CardContent className="grid flex-1 grid-cols-1 gap-4">
            {MASTER_ACTIONS.map((action) => {
              const colors = COLOR_VARIANTS[action.color as ColorVariant];
              return <ActionLink key={action.href} action={action} colors={colors} />;
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-secondary text-xl font-semibold">システム</h2>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SYSTEM_ACTIONS.map((action) => {
            const colors = COLOR_VARIANTS[action.color as ColorVariant];
            return <ActionLink key={action.href} action={action} colors={colors} />;
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function ActionLink({
  action,
  colors,
}: {
  action: { href: string; icon: React.ElementType; label: string; description: string };
  colors: {
    qaBg: string;
    qaText: string;
    qaHoverBg: string;
    qaHoverText: string;
  };
}) {
  return (
    <Link
      href={action.href}
      className="group flex items-center justify-between rounded-lg border border-gray-100 p-4 transition-all hover:border-gray-200 hover:bg-gray-50"
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg transition-colors group-hover:text-white',
            colors.qaBg,
            colors.qaText,
            colors.qaHoverBg
          )}
        >
          <action.icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-secondary font-semibold">{action.label}</h4>
          <p className="text-sm text-gray-500">{action.description}</p>
        </div>
      </div>
      <ArrowRight className={cn('h-5 w-5 text-gray-300 transition-colors', colors.qaHoverText)} />
    </Link>
  );
}
