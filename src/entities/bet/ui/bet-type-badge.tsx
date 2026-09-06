import { BET_TYPE_LABELS, BET_TYPES, type BetType } from '@/entities/bet/constants';
import { cn } from '@/shared/utils/cn';

// 券種の慣習色。JRA の払戻表示に倣った配色で、払戻モーダルと管理画面の馬券一覧で共有する
export const BET_TYPE_COLORS = {
  [BET_TYPES.WIN]: 'bg-blue-800 text-white',
  [BET_TYPES.PLACE]: 'bg-red-600 text-white',
  [BET_TYPES.BRACKET_QUINELLA]: 'bg-green-700 text-white',
  [BET_TYPES.QUINELLA]: 'bg-purple-800 text-white',
  [BET_TYPES.WIDE]: 'bg-cyan-600 text-white',
  [BET_TYPES.EXACTA]: 'bg-yellow-500 text-black',
  [BET_TYPES.TRIO]: 'bg-blue-600 text-white',
  [BET_TYPES.TRIFECTA]: 'bg-amber-700 text-white',
} satisfies Record<BetType, string>;

/** 券種を慣習色の小さなチップで表す。一覧の行内で券種を一目で見分ける用途。 */
export function BetTypeBadge({ type, className }: { type: BetType; className?: string }) {
  return (
    <span
      className={cn(
        'rounded-chip inline-flex items-center px-2 py-0.5 text-sm font-semibold whitespace-nowrap',
        BET_TYPE_COLORS[type],
        className
      )}
    >
      {BET_TYPE_LABELS[type]}
    </span>
  );
}
