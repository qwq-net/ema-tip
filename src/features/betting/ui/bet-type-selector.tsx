import { BET_TYPE_LABELS, BET_TYPE_ORDER, BetType } from '@/entities/bet';
import { Button } from '@/shared/ui';

interface BetTypeSelectorProps {
  betType: BetType;
  onBetTypeChange: (type: BetType) => void;
  // null は全種別購入可。配列のときは含まれない種別を無効化する
  allowedBetTypes?: BetType[] | null;
}

// 未選択ボタンの追加クラス。選択中は variant 側で色が付くため空にし、購入できない券種は取り消し線で示す
function betTypeButtonClass(isSelected: boolean, isAllowed: boolean): string {
  if (isSelected) return '';
  return isAllowed ? 'bg-white text-gray-700 hover:bg-gray-50' : 'text-text-sub bg-gray-100 line-through';
}

export function BetTypeSelector({ betType, onBetTypeChange, allowedBetTypes }: BetTypeSelectorProps) {
  return (
    <div className="rounded-surface flex flex-wrap gap-2 bg-gray-100 p-2">
      {BET_TYPE_ORDER.map((type) => {
        const isAllowed = !allowedBetTypes || allowedBetTypes.includes(type);
        return (
          <Button
            key={type}
            type="button"
            onClick={() => onBetTypeChange(type)}
            aria-pressed={betType === type}
            disabled={!isAllowed}
            variant={betType === type ? 'primary' : 'ghost'}
            className={`rounded-control px-4 py-2 text-sm font-medium transition ${betTypeButtonClass(betType === type, isAllowed)}`}
          >
            {BET_TYPE_LABELS[type]}
          </Button>
        );
      })}
    </div>
  );
}
