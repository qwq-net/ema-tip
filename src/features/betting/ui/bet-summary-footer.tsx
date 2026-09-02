import { Button, NumericInput } from '@/shared/ui';
import { Calculator, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NumericKeypad } from './numeric-keypad';

interface BetSummaryFooterProps {
  betCount: number;
  totalAmount: number;
  amount: number;
  balance: number;
  isClosed: boolean;
  isPending: boolean;
  onAmountChange: (amount: number) => void;
  onSubmit: () => void;
  /** 確定ボタンのラベル。通常馬券は既定の「購入確定」、BET5 は投票の語で渡す。 */
  submitLabel?: string;
}

export function BetSummaryFooter({
  betCount,
  totalAmount,
  amount,
  balance,
  isClosed,
  isPending,
  onAmountChange,
  onSubmit,
  submitLabel = '購入確定',
}: BetSummaryFooterProps) {
  const [showKeypad, setShowKeypad] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showKeypad) {
      inputRef.current?.focus();
    }
  }, [showKeypad]);

  useEffect(() => {
    if (!showKeypad) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowKeypad(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showKeypad]);

  const displayValue = amount / 100;

  const handleDigit = useCallback(
    (n: number) => {
      const valStr = displayValue === 0 ? '' : displayValue.toString();
      const newVal = parseInt(`${valStr}${n}`, 10);
      if (newVal <= 999999) {
        onAmountChange(newVal * 100);
      }
    },
    [displayValue, onAmountChange]
  );

  const handleBackspace = useCallback(() => {
    const valStr = displayValue.toString();
    if (valStr.length <= 1) {
      onAmountChange(0);
    } else {
      onAmountChange(parseInt(valStr.slice(0, -1), 10) * 100);
    }
  }, [displayValue, onAmountChange]);

  const handleClear = useCallback(() => {
    onAmountChange(0);
  }, [onAmountChange]);

  const handleEnter = useCallback(() => {
    if (showKeypad) {
      setShowKeypad(false);
    }
  }, [showKeypad]);

  return (
    <div className="rounded-surface border border-gray-200 bg-gray-50/50 p-4 md:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4 lg:flex lg:items-center lg:gap-8 lg:border-none lg:pb-0">
          <div className="flex flex-col gap-1 lg:items-start">
            <span className="text-sm text-gray-500">購入点数</span>
            <span className="text-primary text-xl font-semibold tabular-nums">{betCount}点</span>
          </div>
          <div className="flex flex-col gap-1 lg:items-start">
            <span className="text-sm text-gray-500">合計金額</span>
            <span className="text-xl font-semibold text-gray-900 tabular-nums">
              {totalAmount.toLocaleString('ja-JP')}円
            </span>
          </div>
          <div className="col-span-2 flex flex-col gap-2 lg:col-auto lg:flex-row lg:items-center lg:gap-3">
            <label htmlFor="bet-unit-amount" className="text-sm text-gray-500">
              1点あたり
            </label>
            <div className="flex items-center gap-2">
              <NumericInput
                id="bet-unit-amount"
                ref={inputRef}
                value={displayValue}
                onChange={(val) => onAmountChange((val || 0) * 100)}
                min={0}
                max={999999}
                disabled={isClosed || isPending}
                className="w-28 text-right font-semibold disabled:bg-gray-100"
                suffix="00円"
                onEnter={handleEnter}
              />
              <div className="relative">
                <Button
                  type="button"
                  onClick={() => setShowKeypad(!showKeypad)}
                  disabled={isClosed || isPending}
                  variant="outline"
                  size="icon"
                  className="hover:text-primary h-10 w-10 text-gray-500"
                  title="キーパッドで入力"
                >
                  <Calculator className="h-5 w-5" />
                </Button>
                {showKeypad && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowKeypad(false)} />
                    <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2">
                      <NumericKeypad
                        onDigit={handleDigit}
                        onBackspace={handleBackspace}
                        onClear={handleClear}
                        onClose={() => setShowKeypad(false)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between lg:justify-end">
          <div className="flex flex-col items-center gap-1 sm:items-end">
            <span className="text-text-sub text-sm">投票可能残高</span>
            <span className="text-sm font-semibold text-gray-600 tabular-nums">
              {balance.toLocaleString('ja-JP')}円
            </span>
          </div>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isClosed || isPending || betCount === 0 || totalAmount > balance}
            className="h-12 w-full font-semibold sm:w-48"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                処理中...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
