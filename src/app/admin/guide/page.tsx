import { Card } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'クイックガイド | 管理画面',
};

type Step = {
  title: string;
  description: string;
  href: string;
};

const MASTER_STEPS: Step[] = [
  { title: '競馬場管理', description: '名前・略称・回り方向・エリアを登録します。', href: '/admin/venues' },
  { title: '馬タグ管理', description: '逃げや重馬場得意などの脚質・特性タグを登録します。', href: '/admin/horse-tags' },
  { title: '馬マスタ管理', description: '血統・性齢を登録し、タグを付与します。', href: '/admin/horses' },
  {
    title: 'レースマスタ管理',
    description: '重賞名・グレード・距離のテンプレートを登録します。',
    href: '/admin/race-definitions',
  },
];

const FLOW_STEPS: Step[] = [
  {
    title: 'イベント作成',
    description: '開催日と初期配布金額を設定し、開催中にすると参加できるようになります。',
    href: '/admin/events/new',
  },
  {
    title: 'レース作成',
    description: '会場とレース番号を選びます。条件はマスタから読み込めます。',
    href: '/admin/races/new',
  },
  { title: '出走馬登録', description: 'ドラッグで枠順を確定すると馬券が購入可能になります。', href: '/admin/entries' },
  { title: 'BET5設定', description: '5重勝の対象レースを指定します。', href: '/admin/bet5' },
];

const OTHER_ITEMS: Step[] = [
  { title: '馬券管理', description: '全ユーザーの購入と的中状況を確認します。', href: '/admin/bets' },
  {
    title: '保証オッズ設定',
    description: '最低保証倍率の既定値を設定します。レース個別でも調整できます。',
    href: '/admin/settings/odds',
  },
  { title: 'ユーザー管理', description: '権限の変更とユーザー情報の編集を行います。', href: '/admin/users' },
  { title: 'ゲストコード管理', description: '招待コードの発行と整理を行います。', href: '/admin/users/guests' },
];

// マーカー色はダッシュボードと同じセクション単位の2段ルール。運用フローは brand、それ以外は neutral
const TONES = {
  brand: 'bg-turf-100 text-turf-800',
  neutral: 'bg-gray-100 text-gray-600',
} as const;

/**
 * ガイドの1セクション分のステップリスト。行全体が対象画面へのリンクになる。
 * ordered を渡すと作業順を表す番号マーカーを付ける。順序のない一覧では付けない。
 */
function StepList({ steps, tone, ordered = false }: { steps: Step[]; tone: keyof typeof TONES; ordered?: boolean }) {
  const ListTag = ordered ? 'ol' : 'ul';
  return (
    <Card className="overflow-hidden">
      <ListTag className="divide-y divide-gray-100">
        {steps.map((step, index) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              {ordered && (
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    TONES[tone]
                  )}
                >
                  {index + 1}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-gray-900">{step.title}</span>
                <span className="text-text-sub ml-3 text-sm max-sm:ml-0 max-sm:block">{step.description}</span>
              </span>
              <ChevronRight className="text-text-sub h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ListTag>
    </Card>
  );
}

export default async function AdminGuidePage() {
  return (
    <div className="max-w-3xl space-y-10 pb-12">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">クイックガイド</h1>
        <p className="text-text-sub mt-1">マスタの準備からイベント開催までの流れです。</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-secondary text-lg font-semibold">準備編 マスタデータ</h2>
          <p className="text-text-sub text-sm">初回や新要素の追加時のみ</p>
        </div>
        <StepList steps={MASTER_STEPS} tone="neutral" ordered />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-secondary text-lg font-semibold">運用編 イベント開催</h2>
          <p className="text-text-sub text-sm">イベントごとに毎回行うフロー</p>
        </div>
        <StepList steps={FLOW_STEPS} tone="brand" ordered />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-secondary text-lg font-semibold">その他の管理</h2>
          <p className="text-text-sub text-sm">必要になったときに使います</p>
        </div>
        <StepList steps={OTHER_ITEMS} tone="neutral" />
      </section>
    </div>
  );
}
