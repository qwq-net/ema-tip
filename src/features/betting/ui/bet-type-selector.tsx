import { BET_TYPE_LABELS, BET_TYPE_ORDER, BetType } from '@/entities/bet';
import { Button } from '@/shared/ui';

interface BetTypeSelectorProps {
  betType: BetType;
  onBetTypeChange: (type: BetType) => void;
}

export function BetTypeSelector({ betType, onBetTypeChange }: BetTypeSelectorProps) {
  return (
    <div className="rounded-surface flex flex-wrap gap-2 bg-gray-100 p-2">
      {BET_TYPE_ORDER.map((type) => (
        <Button
          key={type}
          type="button"
          onClick={() => onBetTypeChange(type)}
          aria-pressed={betType === type}
          variant={betType === type ? 'primary' : 'ghost'}
          className={`rounded-control px-4 py-2 text-sm font-medium transition ${
            betType === type ? '' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {BET_TYPE_LABELS[type]}
        </Button>
      ))}
    </div>
  );
}
