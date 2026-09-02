import { cn } from '@/shared/utils/cn';
import { getPasswordManagerIgnoreAttributes } from '@/shared/utils/form';
import React from 'react';

export const Label = ({ children, htmlFor, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label htmlFor={htmlFor} className={cn('mb-1.5 block text-sm font-semibold text-gray-700', className)} {...props}>
    {children}
  </label>
);

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  ignorePasswordManager?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ignorePasswordManager = true, ...props }, ref) => {
    const ignoreAttrs = getPasswordManagerIgnoreAttributes(ignorePasswordManager);
    return (
      <input
        ref={ref}
        className={cn(
          'focus:ring-primary/20 focus:border-primary w-full rounded-md border border-gray-300 px-3 py-2 text-base transition-all focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
          className
        )}
        {...ignoreAttrs}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'focus:ring-primary/20 focus:border-primary w-full rounded-md border border-gray-300 px-3 py-2 text-base transition-all focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'focus:ring-primary/20 focus:border-primary w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-base transition-all focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    );
  }
);
Select.displayName = 'Select';
