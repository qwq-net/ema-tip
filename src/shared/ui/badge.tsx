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

export function Badge({ label, variant = 'outline', className, children }: BadgeProps) {
  const content =
    children || (label && (lookup(EVENT_STATUS_LABELS, label) || lookup(RACE_STATUS_LABELS, label) || label));
  if (!content) return <span>-</span>;

  // 分類チップの色は @theme のカテゴリ識別パレット cat-* を使う。
  // 色相と分類の対応はこの switch が単一の管理点で、生の Tailwind 色は書かない
  const getVariantStyles = () => {
    switch (variant) {
      case 'surface':
        return label === '芝' ? 'bg-cat-green-bg text-cat-green-text' : 'bg-cat-amber-bg text-cat-amber-text';

      case 'condition':
        switch (label) {
          case '良':
            return 'bg-cat-blue-bg text-cat-blue-text';
          case '稍重':
            return 'bg-cat-cyan-bg text-cat-cyan-text';
          case '重':
            return 'bg-gray-200 text-gray-800';
          case '不良':
            return 'bg-gray-300 text-gray-800';
          default:
            return 'bg-gray-100 text-gray-800';
        }

      case 'status':
        switch (label) {
          case 'SCHEDULED':
          case '受付中':
          case 'Active':
          case '有効':
          case '出走前':
          case '準備中':
            return 'bg-cat-green-bg text-cat-green-text';
          case 'ACTIVE':
          case '開催中':
            return 'bg-cat-blue-bg text-cat-blue-text';
          case 'CLOSED':
          case '締切済み':
            return 'bg-cat-orange-bg text-cat-orange-text';
          case 'RANKING_CONFIRMED':
          case '着順確定':
            return 'bg-cat-indigo-bg/50 text-cat-indigo-text ring-cat-indigo-bg';
          case 'FINALIZED':
          case '結果確定済み':
          case '払戻確定':
            return 'bg-cat-indigo-bg text-cat-indigo-text';
          case 'COMPLETED':
          case '終了':
            return 'bg-gray-100 text-gray-800';
          case 'Disabled':
          case '無効':
            return 'bg-cat-red-bg text-cat-red-text';
          default:
            return 'bg-gray-100 text-gray-800';
        }

      case 'gender':
        return getGenderBadgeClass(label?.charAt(0) ?? '');

      case 'role':
        switch (label) {
          case 'ADMIN':
            return 'bg-cat-blue-bg text-cat-blue-text';
          case 'TIPSTER':
            return 'bg-cat-orange-bg text-cat-orange-text';
          case 'AI_TIPSTER':
            return 'bg-cat-purple-bg text-cat-purple-text';
          case 'GUEST':
            return 'bg-gray-100 text-gray-800';
          case 'You':
            return 'bg-turf-100 text-turf-800';
          default:
            return 'bg-gray-100 text-gray-800';
        }

      case 'origin':
        switch (label) {
          case 'DOMESTIC':
          case '日本産':
            return 'bg-white text-gray-700 ring-gray-200';
          case 'FOREIGN_BRED':
          case '外国産':
            return 'bg-cat-orange-bg/60 text-cat-orange-text ring-cat-orange-bg';
          case 'FOREIGN_TRAINED':
          case '外来馬':
            return 'bg-cat-purple-bg/60 text-cat-purple-text ring-cat-purple-bg';
          default:
            return 'bg-gray-50 text-gray-600 ring-gray-200';
        }

      case 'outline':
      default:
        return 'bg-white text-gray-700 ring-gray-200';
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
