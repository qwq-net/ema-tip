'use client';

import { cn } from '@/shared/utils/cn';
import { getPasswordManagerIgnoreAttributes } from '@/shared/utils/form';
import React, { useCallback, useRef } from 'react';

function formatWithCommas(value: number): string {
  if (isNaN(value) || value === 0) return '';
  return value.toLocaleString('en-US');
}

/** 入力欄に出す文字列を返す。小数入力では 0 を空欄として扱い、整数入力では 3 桁区切りにする。 */
function formatDisplayValue(value: number, allowDecimal: boolean): string {
  if (!allowDecimal) return formatWithCommas(value);
  return value === 0 ? '' : value.toString();
}

function parseNumericString(str: string): number {
  const cleaned = str.replace(/\D/g, '');
  if (cleaned === '') return 0;
  return parseInt(cleaned, 10);
}

/** 小数入力の生文字列を数字と小数点だけに絞り、2 つ目以降の小数点を落とした文字列を返す。 */
function sanitizeDecimalString(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join('')}`;
}

/** 値が min と max の範囲内かどうか。未指定の側は制限なしとして扱う。 */
function isWithinRange(value: number, min: number | undefined, max: number | undefined): boolean {
  if (max !== undefined && value > max) return false;
  if (min !== undefined && value < min) return false;
  return true;
}

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  allowDecimal?: boolean;
  placeholder?: string;
  name?: string;
  ignorePasswordManager?: boolean;
  onEnter?: () => void;
  suffix?: string;
}

export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      value,
      onChange,
      id,
      min,
      max,
      disabled,
      className,
      allowDecimal = false,
      placeholder,
      name,
      ignorePasswordManager = true,
      onEnter,
      suffix,
    },
    ref
  ) => {
    const ignoreAttrs = getPasswordManagerIgnoreAttributes(ignorePasswordManager);
    const isComposing = useRef(false);
    const isFocused = useRef(false);
    // この入力自身が onChange で親へ通知した最後の値。
    // これと異なる value が来たらキーパッドやリセットなど外部起点の変更なので、フォーカス中でも表示へ反映する
    const lastEmitted = useRef(value);

    const [localValue, setLocalValue] = React.useState(formatDisplayValue(value, allowDecimal));

    React.useEffect(() => {
      if (isComposing.current) return;
      if (isFocused.current && value === lastEmitted.current) return;
      const nextValue = formatDisplayValue(value, allowDecimal);
      setLocalValue(nextValue);
      lastEmitted.current = value;
    }, [value, allowDecimal]);

    const emitChange = useCallback(
      (num: number) => {
        lastEmitted.current = num;
        onChange(num);
      },
      [onChange]
    );

    const handleCompositionStart = useCallback(() => {
      isComposing.current = true;
    }, []);

    const handleCompositionEnd = useCallback(
      (e: React.CompositionEvent<HTMLInputElement>) => {
        isComposing.current = false;
        const targetValue = e.currentTarget.value;
        setLocalValue(targetValue);

        if (allowDecimal) {
          const num = parseFloat(targetValue.replace(/[^0-9.]/g, ''));
          emitChange(isNaN(num) ? 0 : num);
        } else {
          const num = parseNumericString(targetValue);
          emitChange(num);
        }
      },
      [emitChange, allowDecimal]
    );

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;

        if (isComposing.current) {
          setLocalValue(raw);
          return;
        }

        if (allowDecimal) {
          const sanitized = sanitizeDecimalString(raw);
          const decimalValue = parseFloat(sanitized);
          if (isNaN(decimalValue)) {
            setLocalValue('');
            emitChange(0);
            return;
          }
          if (!isWithinRange(decimalValue, min, max)) return;

          setLocalValue(sanitized);
          emitChange(decimalValue);
          return;
        }

        if (raw.replace(/\D/g, '') === '') {
          setLocalValue('');
          emitChange(0);
          return;
        }

        const num = parseNumericString(raw);
        if (!isWithinRange(num, min, max)) return;

        setLocalValue(formatWithCommas(num));
        emitChange(num);
      },
      [emitChange, min, max, allowDecimal]
    );

    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      isFocused.current = true;
      requestAnimationFrame(() => {
        e.target.select();
      });
    }, []);

    const handleBlur = useCallback(() => {
      isFocused.current = false;
      const formatted = formatDisplayValue(value, allowDecimal);
      setLocalValue(formatted);
    }, [value, allowDecimal]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && onEnter) {
          e.preventDefault();
          onEnter();
        }
      },
      [onEnter]
    );

    const inputElement = (
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={onEnter ? handleKeyDown : undefined}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        disabled={disabled}
        placeholder={placeholder ?? '0'}
        name={name}
        className={cn(
          'focus:ring-primary/20 focus:border-primary rounded-control w-full border border-gray-300 px-3 py-2 text-base transition focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
          suffix && 'pr-12',
          className
        )}
        {...ignoreAttrs}
      />
    );

    if (suffix) {
      return (
        <div className="relative flex items-center">
          {inputElement}
          <span className="text-text-sub pointer-events-none absolute right-3 text-sm">{suffix}</span>
        </div>
      );
    }

    return inputElement;
  }
);
NumericInput.displayName = 'NumericInput';
