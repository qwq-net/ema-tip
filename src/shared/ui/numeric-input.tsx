'use client';

import { cn } from '@/shared/utils/cn';
import { getPasswordManagerIgnoreAttributes } from '@/shared/utils/form';
import React, { useCallback, useImperativeHandle, useRef } from 'react';

function formatWithCommas(value: number): string {
  if (isNaN(value) || value === 0) return '';
  return value.toLocaleString('en-US');
}

function parseNumericString(str: string): number {
  const cleaned = str.replace(/[^0-9]/g, '');
  if (cleaned === '') return 0;
  return parseInt(cleaned, 10);
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
    const innerRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => innerRef.current!);
    const isComposing = useRef(false);
    const isFocused = useRef(false);
    // この入力自身が onChange で親へ通知した最後の値。
    // これと異なる value が来たら外部起点の変更（キーパッド・リセット等）なので、フォーカス中でも表示へ反映する
    const lastEmitted = useRef(value);

    const [localValue, setLocalValue] = React.useState(
      allowDecimal ? (value === 0 ? '' : value.toString()) : formatWithCommas(value)
    );

    React.useEffect(() => {
      if (isComposing.current) return;
      if (isFocused.current && value === lastEmitted.current) return;
      const nextValue = allowDecimal ? (value === 0 ? '' : value.toString()) : formatWithCommas(value);
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
          const cleaned = raw.replace(/[^0-9.]/g, '');
          const parts = cleaned.split('.');
          const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
          const num = parseFloat(sanitized);
          if (isNaN(num)) {
            setLocalValue('');
            emitChange(0);
          } else {
            if (max !== undefined && num > max) return;
            if (min !== undefined && num < min) return;
            setLocalValue(sanitized);
            emitChange(num);
          }
          return;
        }

        if (raw.replace(/[^0-9]/g, '') === '') {
          setLocalValue('');
          emitChange(0);
          return;
        }

        const num = parseNumericString(raw);
        if (max !== undefined && num > max) return;
        if (min !== undefined && num < min) return;

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
      const formatted = allowDecimal ? (value === 0 ? '' : value.toString()) : formatWithCommas(value);
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
        ref={innerRef}
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
          'focus:ring-primary/20 focus:border-primary w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
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
          <span className="pointer-events-none absolute right-3 text-sm font-semibold text-gray-400">{suffix}</span>
        </div>
      );
    }

    return inputElement;
  }
);
NumericInput.displayName = 'NumericInput';
