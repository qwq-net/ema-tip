import { cn } from '@/shared/utils/cn';
import React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        className={cn(
          'text-primary focus:ring-primary rounded-chip h-5 w-5 cursor-pointer border-gray-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onChange={(e) => {
          onChange?.(e);
          onCheckedChange?.(e.target.checked);
        }}
        {...props}
      />
    );
  }
);
Checkbox.displayName = 'Checkbox';
