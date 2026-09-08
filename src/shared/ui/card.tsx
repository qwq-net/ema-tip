import { cn } from '@/shared/utils/cn';
import { type ComponentProps } from 'react';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('bg-surface rounded-surface border border-gray-200', className)} {...props} />;
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-6 pb-0', className)} {...props} />;
}

interface CardTitleProps extends ComponentProps<'h3'> {
  as?: 'h2' | 'h3' | 'h4';
}

/**
 * カードの見出し。as でページの見出し階層に合わせた見出しレベルを選ぶ。
 * as を変えても文字サイズは text-lg のままで、見た目は変わらない。
 */
export function CardTitle({ className, children, as: Tag = 'h3', ...props }: CardTitleProps) {
  return (
    <Tag className={cn('text-text-main text-lg font-semibold', className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-6', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-text-sub text-sm', className)} {...props} />;
}
