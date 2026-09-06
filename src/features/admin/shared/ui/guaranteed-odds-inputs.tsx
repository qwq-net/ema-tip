'use client';

import { BET_TYPE_LABELS, BET_TYPES } from '@/entities/bet';
import { Label, NumericInput } from '@/shared/ui';

interface GuaranteedOddsInputsProps {
  value: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
  // 空欄のときに薄く出す倍率。レース単位ではデフォルト設定の値を渡し、空欄がその値で動くことを示す
  placeholders: Record<string, number>;
}

export function GuaranteedOddsInputs({ value, onChange, placeholders }: GuaranteedOddsInputsProps) {
  const handleChange = (type: string, numValue: number) => {
    // いったん対象のキーを外し、0 以外なら入れ直す。0 は未設定を意味するためキーごと残さない
    const newValue = Object.fromEntries(Object.entries(value).filter(([key]) => key !== type));
    if (numValue !== 0) {
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
            id={`odds-${type}`}
            value={value[type] ?? 0}
            onChange={(val) => handleChange(type, val)}
            min={0}
            allowDecimal
            placeholder={placeholders[type]?.toFixed(1) ?? ''}
          />
        </div>
      ))}
    </div>
  );
}
