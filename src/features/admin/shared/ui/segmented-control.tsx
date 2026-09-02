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
            'rounded-control px-3 py-1.5 text-sm font-medium transition',
            value === option.value ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-900'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
