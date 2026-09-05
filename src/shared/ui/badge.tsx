import { EVENT_STATUS_LABELS, RACE_STATUS_LABELS } from '@/shared/constants/status';
import { cn } from '@/shared/utils/cn';
import { getGenderBadgeClass } from '@/shared/utils/gender';
import { lookup } from '@/shared/utils/lookup';

type BadgeVariant = 'surface' | 'condition' | 'status' | 'gender' | 'role' | 'origin' | 'outline';

interface BadgeProps {
  label: string | null;
  variant?: BadgeVariant;
  className?: string;
  children?: React.ReactNode;
}

// 分類チップの色は @theme のカテゴリ識別パレット cat-* を使う。
// 色相と分類の対応は以下の定数群が単一の管理点。
// gray は @theme で上書き済みの紙ニュートラルなので、無彩色の分類にだけ使ってよい
const CONDITION_STYLES = {
  良: 'bg-cat-blue-bg text-cat-blue-text',
  稍重: 'bg-cat-cyan-bg text-cat-cyan-text',
  重: 'bg-gray-200 text-gray-800',
  不良: 'bg-gray-300 text-gray-800',
} satisfies Record<string, string>;

const CONDITION_FALLBACK = 'bg-gray-100 text-gray-800';

// 英語キーは DB の列挙値、日本語キーは画面表示済みのラベル。どちらで渡されても同じ色になる
const STATUS_STYLES = {
  SCHEDULED: 'bg-cat-green-bg text-cat-green-text',
  受付中: 'bg-cat-green-bg text-cat-green-text',
  Active: 'bg-cat-green-bg text-cat-green-text',
  有効: 'bg-cat-green-bg text-cat-green-text',
  出走前: 'bg-cat-green-bg text-cat-green-text',
  準備中: 'bg-cat-green-bg text-cat-green-text',
  ACTIVE: 'bg-cat-blue-bg text-cat-blue-text',
  開催中: 'bg-cat-blue-bg text-cat-blue-text',
  CLOSED: 'bg-cat-orange-bg text-cat-orange-text',
  締切済み: 'bg-cat-orange-bg text-cat-orange-text',
  RANKING_CONFIRMED: 'bg-cat-indigo-bg/50 text-cat-indigo-text ring-cat-indigo-bg',
  着順確定: 'bg-cat-indigo-bg/50 text-cat-indigo-text ring-cat-indigo-bg',
  FINALIZED: 'bg-cat-indigo-bg text-cat-indigo-text',
  結果確定済み: 'bg-cat-indigo-bg text-cat-indigo-text',
  払戻確定: 'bg-cat-indigo-bg text-cat-indigo-text',
  COMPLETED: 'bg-gray-100 text-gray-800',
  終了: 'bg-gray-100 text-gray-800',
  Disabled: 'bg-cat-red-bg text-cat-red-text',
  無効: 'bg-cat-red-bg text-cat-red-text',
} satisfies Record<string, string>;

const STATUS_FALLBACK = 'bg-gray-100 text-gray-800';

const ROLE_STYLES = {
  ADMIN: 'bg-cat-blue-bg text-cat-blue-text',
  TIPSTER: 'bg-cat-orange-bg text-cat-orange-text',
  AI_TIPSTER: 'bg-cat-purple-bg text-cat-purple-text',
  GUEST: 'bg-gray-100 text-gray-800',
  You: 'bg-turf-100 text-turf-800',
} satisfies Record<string, string>;

const ROLE_FALLBACK = 'bg-gray-100 text-gray-800';

const ORIGIN_STYLES = {
  DOMESTIC: 'bg-white text-gray-700 ring-gray-200',
  日本産: 'bg-white text-gray-700 ring-gray-200',
  FOREIGN_BRED: 'bg-cat-orange-bg/60 text-cat-orange-text ring-cat-orange-bg',
  外国産: 'bg-cat-orange-bg/60 text-cat-orange-text ring-cat-orange-bg',
  FOREIGN_TRAINED: 'bg-cat-purple-bg/60 text-cat-purple-text ring-cat-purple-bg',
  外来馬: 'bg-cat-purple-bg/60 text-cat-purple-text ring-cat-purple-bg',
} satisfies Record<string, string>;

const ORIGIN_FALLBACK = 'bg-gray-50 text-gray-600 ring-gray-200';

const OUTLINE_STYLES = 'bg-white text-gray-700 ring-gray-200';

export function Badge({ label, variant = 'outline', className, children }: BadgeProps) {
  const content =
    children || (label && (lookup(EVENT_STATUS_LABELS, label) || lookup(RACE_STATUS_LABELS, label) || label));
  if (!content) return <span>-</span>;

  // label が null のときは空文字で引き、どの分類でも既定色へ落とす
  const key = label ?? '';
  const getVariantStyles = () => {
    switch (variant) {
      case 'surface':
        return label === '芝' ? 'bg-cat-green-bg text-cat-green-text' : 'bg-cat-amber-bg text-cat-amber-text';

      case 'condition':
        return lookup(CONDITION_STYLES, key) ?? CONDITION_FALLBACK;

      case 'status':
        return lookup(STATUS_STYLES, key) ?? STATUS_FALLBACK;

      case 'gender':
        return getGenderBadgeClass(key.charAt(0));

      case 'role':
        return lookup(ROLE_STYLES, key) ?? ROLE_FALLBACK;

      case 'origin':
        return lookup(ORIGIN_STYLES, key) ?? ORIGIN_FALLBACK;

      case 'outline':
      default:
        return OUTLINE_STYLES;
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-sm font-semibold whitespace-nowrap ring-1 ring-black/5 ring-inset',
        getVariantStyles(),
        className
      )}
    >
      {content}
    </span>
  );
}
