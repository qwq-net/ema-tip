import { Calculator, Delete, X } from 'lucide-react';

interface NumericKeypadProps {
  onDigit: (n: number) => void;
  onBackspace: () => void;
  onClear: () => void;
  onClose: () => void;
}

const preventFocusSteal = (e: React.MouseEvent) => e.preventDefault();

export function NumericKeypad({ onDigit, onBackspace, onClear, onClose }: NumericKeypadProps) {
  return (
    <div className="animate-in fade-in zoom-in w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl duration-200">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Calculator className="text-primary h-4 w-4" />
          <span>金額入力</span>
        </div>
        <button
          onClick={onClose}
          onMouseDown={preventFocusSteal}
          aria-label="キーパッドを閉じる"
          className="text-text-sub rounded-full p-1 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 p-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => onDigit(n)}
            onMouseDown={preventFocusSteal}
            className="flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-xl font-semibold text-gray-900 transition-all hover:bg-gray-100 active:scale-95"
          >
            {n}
          </button>
        ))}
        <button
          onClick={onClear}
          onMouseDown={preventFocusSteal}
          className="flex h-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 active:scale-95"
        >
          クリア
        </button>
        <button
          onClick={() => onDigit(0)}
          onMouseDown={preventFocusSteal}
          className="flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-xl font-semibold text-gray-900 transition-all hover:bg-gray-100 active:scale-95"
        >
          0
        </button>
        <button
          onClick={onBackspace}
          onMouseDown={preventFocusSteal}
          aria-label="1文字削除"
          className="flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600 transition-all hover:bg-gray-100 active:scale-95"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
