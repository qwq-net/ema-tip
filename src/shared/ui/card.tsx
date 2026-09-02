import { cn } from '@/shared/utils/cn';
import { type ComponentProps } from 'react';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('bg-surface rounded-surface border border-gray-200', className)} {...props} />;
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-6 pb-0', className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return <h3 className={cn('text-lg font-semibold text-gray-900', className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-6', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-sm text-gray-500', className)} {...props} />;
}
