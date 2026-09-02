import { Card } from '@/shared/ui';
import {
  BookOpen,
  Calendar,
  Carrot,
  ChevronRight,
  ClipboardList,
  Coins,
  Crown,
  Key,
  MapPin,
  Settings,
  Tag,
  Ticket,
  Trophy,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'クイックガイド | 管理画面',
};

const MASTER_STEPS = [
  {
    title: '1. 競馬場管理',
    description: '開催場所を定義します。',
    icon: MapPin,
    href: '/admin/venues',
    points: ['名前、略称、回り方向を設定します。', 'エリア（関東・関西等）を区分します。'],
  },
  {
    title: '2. 馬タグ管理',
    description: '脚質や特性の選択肢を作成します。',
    icon: Tag,
    href: '/admin/horse-tags',
    points: ['「逃げ」や「重馬場得意」などのタグを登録します。', '馬の個性を表現するために重要です。'],
  },
  {
    title: '3. 馬マスタ管理',
    description: '競走馬の基本情報を登録します。',
    icon: Carrot,
    href: '/admin/horses',
    points: ['血統、性別、年齢などを設定します。', '先ほど作成したタグを付与できます。'],
  },
  {
    title: '4. レースマスタ管理',
    description: '重賞などの条件テンプレートを作成します。',
    icon: BookOpen,
    href: '/admin/race-definitions',
    points: ['レース名、グレード、距離を定義します。', '開催ごとの入力の手間を省けます。'],
  },
];

const FLOW_STEPS = [
  {
    title: '1. イベント作成',
    description: '開催の基盤となるイベントを作成します。',
    icon: Calendar,
    href: '/admin/events/new',
    points: ['開催日と初期配布金額を設定します。', 'ステータスを「開催中」にすると参加可能になります。'],
  },
  {
    title: '2. レース作成',
    description: 'イベント内に具体的なレースを追加します。',
    icon: Trophy,
    href: '/admin/races/new',
    points: ['日付、会場、レース番号を選択します。', 'マスタから条件を読み込むことができます。'],
  },
  {
    title: '3. 出走馬登録',
    description: 'レースに馬を割り当て、枠順を確定します。',
    icon: ClipboardList,
    href: '/admin/entries',
    points: ['ドラッグ＆ドロップで枠順を決定します。', 'これが完了すると馬券が購入可能になります。'],
  },
  {
    title: '4. BET5設定',
    description: '5重勝の対象レースを指定します。',
    icon: Crown,
    href: '/admin/bet5',
    points: ['5重勝の対象レースを指定します。', '一攫千金のチャンスを提供します。'],
  },
];

const OTHER_STEPS = [
  {
    title: '1. 馬券管理',
    description: '購入された馬券の状況を確認します。',
    icon: Ticket,
    href: '/admin/bets',
    points: ['全ユーザーの購入履歴を一覧できます。', 'レースごとの詳細や的中の有無を確認します。'],
  },
  {
    title: '2. 保証オッズ設定',
    description: 'システム全体の救済設定を行います。',
    icon: Coins,
    href: '/admin/settings/odds',
    points: ['最低保証オッズのデフォルト値を設定します。', '必要に応じて個別のレースでも調整可能です。'],
  },
  {
    title: '3. ユーザー管理',
    description: '参加者の権限や状態を管理します。',
    icon: Users,
    href: '/admin/users',
    points: ['Discord連携ユーザーの確認ができます。', '管理者の付与やユーザー情報の編集を行います。'],
  },
  {
    title: '4. ゲストコード管理',
    description: '招待用アクセスを制御します。',
    icon: Key,
    href: '/admin/users/guests',
    points: ['一時的に利用可能な招待コードを発行します。', '新規参加者の招待や整理に使用します。'],
  },
];

// ステップ色はダッシュボードと同じセクション単位の2段ルール。
// 毎回行う運用フローは brand、準備とシステムは neutral を使う
const TONES = {
  brand: { chip: 'bg-turf-50 text-turf-700', stripe: 'border-l-turf-500' },
  neutral: { chip: 'bg-gray-100 text-gray-600', stripe: 'border-l-gray-300' },
} as const;

type Step = {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  points: string[];
};

function StepCard({ step, tone }: { step: Step; tone: keyof typeof TONES }) {
  const Icon = step.icon;

  return (
    <Card className={`overflow-hidden border-l-4 border-gray-100 transition ${TONES[tone].stripe}`}>
      <div className="flex h-full flex-col">
        <div className="flex-1 p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className={`rounded-control flex h-9 w-9 items-center justify-center ${TONES[tone].chip}`}>
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-secondary font-semibold">{step.title}</h3>
          </div>

          <p className="mb-4 text-sm text-gray-600">{step.description}</p>

          <div className="mb-4 space-y-2">
            {step.points.map((point, pIdx) => (
              <div key={pIdx} className="flex gap-2 text-sm text-gray-500">
                <div className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
                {point}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <Link
            href={step.href}
            className="text-secondary group flex items-center justify-between text-sm font-medium hover:underline"
          >
            管理画面へ
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default async function AdminGuidePage() {
  return (
    <div className="max-w-6xl space-y-12 pb-12">
      <div className="text-center md:text-left">
        <h1 className="text-2xl font-semibold text-gray-900">クイックガイド</h1>
        <p className="mt-2 text-lg text-gray-500">
          システムの土台作りから、実際のイベント運営までの流れをマスターしましょう。
        </p>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
          <div className="rounded-full bg-gray-100 p-2 text-gray-600">
            <BookOpen className="h-5 w-5" />
          </div>
          <h2 className="text-secondary text-xl font-semibold">【準備編】マスタデータを登録する</h2>
          <p className="text-text-sub ml-auto hidden text-sm font-normal md:block">初回や新要素追加時のみ必要です</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {MASTER_STEPS.map((step, idx) => (
            <StepCard key={idx} step={step} tone="neutral" />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
          <div className="bg-turf-100 text-turf-800 rounded-full p-2">
            <Calendar className="h-5 w-5" />
          </div>
          <h2 className="text-secondary text-xl font-semibold">【運用編】イベントを開催する</h2>
          <p className="text-text-sub ml-auto hidden text-sm font-normal md:block">イベントごとに毎回行うフローです</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FLOW_STEPS.map((step, idx) => (
            <StepCard key={idx} step={step} tone="brand" />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
          <div className="rounded-full bg-gray-100 p-2 text-gray-600">
            <Settings className="h-5 w-5" />
          </div>
          <h2 className="text-secondary text-xl font-semibold">【その他】システム管理</h2>
          <p className="text-text-sub ml-auto hidden text-sm font-normal md:block">環境設定やユーザー情報の管理です</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {OTHER_STEPS.map((step, idx) => (
            <StepCard key={idx} step={step} tone="neutral" />
          ))}
        </div>
      </section>
    </div>
  );
}
