import { AdminPageHeader } from '@/features/admin/ui/admin-page-header';
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

// タイル色はセクション単位の2段ルール。日常業務の運用管理は brand、
// 低頻度のマスタデータとシステムは neutral を使う。タイル個別の色分けはしない
const COLOR_VARIANTS = {
  brand: {
    qaBg: 'bg-turf-100',
    qaText: 'text-turf-800',
    qaHoverBg: 'group-hover:bg-turf-600',
    qaHoverText: 'group-hover:text-turf-700',
  },
  neutral: {
    qaBg: 'bg-gray-100',
    qaText: 'text-gray-600',
    qaHoverBg: 'group-hover:bg-gray-600',
    qaHoverText: 'group-hover:text-gray-600',
  },
} as const;

const OPERATION_ACTIONS = [
  {
    href: '/admin/events',
    icon: Calendar,
    label: 'イベント管理',
    description: 'イベントの追加・編集・確定処理',
  },
  {
    href: '/admin/races',
    icon: Trophy,
    label: 'レース管理',
    description: 'レースの作成・管理',
  },
  {
    href: '/admin/entries',
    icon: ClipboardList,
    label: '出走馬管理',
    description: 'レースへの競走馬の割り当て',
  },
  {
    href: '/admin/bet5',
    icon: Crown,
    label: 'BET5管理',
    description: 'BET5イベントの作成・結果確定',
  },
  {
    href: '/admin/bets',
    icon: Ticket,
    label: '馬券管理',
    description: '購入された馬券の確認と管理',
  },
] as const;

const MASTER_ACTIONS = [
  {
    href: '/admin/venues',
    icon: MapPin,
    label: '競馬場管理',
    description: '競馬場の場所・設定',
  },
  {
    href: '/admin/horse-tags',
    icon: ClipboardList,
    label: '馬タグ管理',
    description: '脚質・特性マスタ',
  },
  {
    href: '/admin/horses',
    icon: Carrot,
    label: '馬マスタ管理',
    description: '競走馬の管理',
  },
  {
    href: '/admin/race-definitions',
    icon: BookOpen,
    label: 'レースマスタ管理',
    description: '重賞名・条件マスタ',
  },
  {
    href: '/admin/settings/odds',
    icon: Coins,
    label: '保証オッズ設定',
    description: 'デフォルト保証オッズ',
  },
] as const;

const SYSTEM_ACTIONS = [
  {
    href: '/admin/users',
    icon: Users,
    label: 'ユーザー管理',
    description: 'ユーザー確認・権限変更',
  },
  {
    href: '/admin/users/guests',
    icon: Key,
    label: 'ゲストコード管理',
    description: 'ログインコードの管理',
  },
] as const;

export default async function AdminPage() {
  return (
    <div className="max-w-5xl space-y-8">
      <AdminPageHeader title="ダッシュボード" />

      <Card className="border-turf-100 bg-turf-50/70 hover:bg-turf-50 transition">
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
            className="text-primary rounded-control flex shrink-0 items-center gap-2 border border-gray-200 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-gray-50 active:scale-[.96]"
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
            {OPERATION_ACTIONS.map((action) => (
              <ActionLink key={action.href} action={action} colors={COLOR_VARIANTS.brand} />
            ))}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <h2 className="text-secondary text-xl font-semibold">マスタデータ</h2>
          </CardHeader>
          <CardContent className="grid flex-1 grid-cols-1 gap-4">
            {MASTER_ACTIONS.map((action) => (
              <ActionLink key={action.href} action={action} colors={COLOR_VARIANTS.neutral} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-secondary text-xl font-semibold">システム</h2>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SYSTEM_ACTIONS.map((action) => (
            <ActionLink key={action.href} action={action} colors={COLOR_VARIANTS.neutral} />
          ))}
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
      className="group rounded-control flex items-center justify-between border border-gray-100 p-4 transition hover:border-gray-200 hover:bg-gray-50"
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'rounded-control flex h-10 w-10 items-center justify-center transition-colors group-hover:text-white',
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
