'use client';

import { BET_TYPE_LABELS, BET_TYPES } from '@/entities/bet';
import { DEFAULT_GUARANTEED_ODDS } from '@/shared/constants/odds';
import { Label, NumericInput } from '@/shared/ui';

interface GuaranteedOddsInputsProps {
  value: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
}

export function GuaranteedOddsInputs({ value, onChange }: GuaranteedOddsInputsProps) {
  const handleChange = (type: string, numValue: number) => {
    const newValue = { ...value };
    if (numValue === 0) {
      delete newValue[type];
    } else {
      newValue[type] = numValue;
    }
    onChange(newValue);
  };

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {Object.values(BET_TYPES).map((type) => (
        <div key={type} className="space-y-2">
          <Label htmlFor={`odds-${type}`}>{BET_TYPE_LABELS[type]}</Label>
          <NumericInput
            value={value[type] || 0}
            onChange={(val) => handleChange(type, val)}
            min={0}
            allowDecimal
            placeholder={DEFAULT_GUARANTEED_ODDS[type].toFixed(1)}
          />
        </div>
      ))}
    </div>
  );
}
