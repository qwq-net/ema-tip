'use client';

import clsx from 'clsx';

// 単一選択のセグメント型トグル。選択状態は親が value / onChange で管理する。
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="rounded-control flex space-x-1 bg-gray-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            'rounded-control px-3 py-1.5 text-sm font-semibold transition',
            value === option.value ? 'text-text-main bg-white' : 'text-text-sub hover:text-text-main'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
