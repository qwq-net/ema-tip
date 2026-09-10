import { describeRaceProgress } from '@/features/admin/manage-events/lib/race-progress';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, SectionTitle } from '@/shared/ui';
import { AdminPageHeader } from '@/shared/ui/layout/admin-page-header';
import { cn } from '@/shared/utils/cn';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Carrot,
  ClipboardList,
  Coins,
  Download,
  Key,
  MapPin,
  Plus,
  Users,
} from 'lucide-react';
import Link from 'next/link';

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
    description: 'すべてのイベントの一覧',
  },
  {
    href: '/admin/events/new',
    icon: Plus,
    label: '新規イベント作成',
    description: 'イベントの作成',
  },
  {
    href: '/admin/import-race',
    icon: Download,
    label: '出馬表インポート',
    description: 'Netkeibaの出馬表から作成',
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
    description: '競走馬のマスタ',
  },
  {
    href: '/admin/race-definitions',
    icon: BookOpen,
    label: 'レースマスタ管理',
    description: '重賞名・条件マスタ',
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
  {
    href: '/admin/settings/odds',
    icon: Coins,
    label: '保証オッズ設定',
    description: '最低保証倍率の既定値',
  },
] as const;

// イベント詳細のタブと同じ並び。ダッシュボードから各タブへ直行する
const EVENT_TABS = [
  { suffix: '', label: 'レース' },
  { suffix: '/settings', label: 'イベント設定' },
  { suffix: '/bet5', label: 'BET5' },
  { suffix: '/ranking', label: 'ランキング' },
] as const;

export interface DashboardEvent {
  id: string;
  name: string;
  date: string;
  status: string;
  races: { status: string }[];
}

/**
 * ダッシュボードに出すイベントを選ぶ。開催中があればその全件、なければ開催日が最も近い準備中 1 件。
 * どちらもなければ空配列で、呼び手は作成への案内を出す。
 */
function pickCurrentEvents(candidates: DashboardEvent[]): DashboardEvent[] {
  const active = candidates.filter((e) => e.status === 'ACTIVE');
  if (active.length > 0) return active;
  const next = candidates.find((e) => e.status === 'SCHEDULED');
  return next ? [next] : [];
}

/** いまのイベント 1 件。名前・開催日・状態・進行状況と、詳細タブへの直行リンクを持つ。 */
function CurrentEventCard({ event }: { event: DashboardEvent }) {
  const base = `/admin/events/${event.id}`;
  return (
    <div className="rounded-control border-turf-100 bg-turf-50/70 flex flex-col gap-4 border p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={base} className="text-secondary truncate text-lg font-semibold hover:underline">
            {event.name}
          </Link>
          <Badge variant="status" label={event.status} />
        </div>
        <p className="text-text-sub text-sm">
          {event.date}
          <span className="mx-2 text-gray-300">/</span>
          {describeRaceProgress(event.races.map((r) => r.status))}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {EVENT_TABS.map((tab) => (
          <Button key={tab.suffix} asChild size="sm" variant="outline">
            <Link href={`${base}${tab.suffix}`}>{tab.label}</Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

/** 管理メニュー 1 件。アイコンの地色はセクションごとの 2 段ルールで呼び手が渡す。 */
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
            'rounded-control flex h-10 w-10 shrink-0 items-center justify-center transition-colors group-hover:text-white',
            colors.qaBg,
            colors.qaText,
            colors.qaHoverBg
          )}
        >
          <action.icon className="h-5 w-5" />
        </div>
        <div>
          <span className="text-secondary block font-semibold">{action.label}</span>
          <p className="text-text-sub text-sm">{action.description}</p>
        </div>
      </div>
      <ArrowRight className={cn('h-5 w-5 shrink-0 text-gray-300 transition-colors', colors.qaHoverText)} />
    </Link>
  );
}

/**
 * 管理者ダッシュボードの本体。いま扱うイベントを先頭に置き、運用管理・マスタデータ・システムの 3 区分で
 * 各管理画面へ振り分ける。events には開催中と準備中のイベントを渡し、どれを出すかはこの部品が選ぶ。
 */
export function AdminDashboard({ events }: { events: DashboardEvent[] }) {
  const currentEvents = pickCurrentEvents(events);

  return (
    <div className="max-w-5xl space-y-8">
      <AdminPageHeader title="ダッシュボード" />

      <Card className="border-turf-100 bg-turf-50/70">
        <CardContent className="flex flex-col items-center justify-between gap-4 p-6 md:flex-row">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
              <BookOpen className="h-5 w-5" />
            </div>
            <CardTitle as="h2">管理者向けクイックガイド</CardTitle>
          </div>
          <Button asChild variant="secondary" className="shrink-0">
            <Link href="/admin/guide">
              ガイドへ
              <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle
            actions={
              <span className="text-text-sub text-sm">
                {currentEvents[0]?.status === 'ACTIVE' ? '開催中のイベント' : '次のイベント'}
              </span>
            }
          >
            運用管理
          </SectionTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentEvents.length > 0 ? (
            <div className="space-y-3">
              {currentEvents.map((event) => (
                <CurrentEventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="rounded-control flex flex-col items-center gap-3 border border-dashed border-gray-200 p-6 text-center">
              <p className="text-text-sub text-sm">開催中や準備中のイベントはありません</p>
              <Button asChild>
                <Link href="/admin/events/new">
                  <Plus />
                  新規イベント作成
                </Link>
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {OPERATION_ACTIONS.map((action) => (
              <ActionLink key={action.href} action={action} colors={COLOR_VARIANTS.brand} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>マスタデータ</SectionTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {MASTER_ACTIONS.map((action) => (
            <ActionLink key={action.href} action={action} colors={COLOR_VARIANTS.neutral} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>システム</SectionTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {SYSTEM_ACTIONS.map((action) => (
            <ActionLink key={action.href} action={action} colors={COLOR_VARIANTS.neutral} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
