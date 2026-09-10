import { cn } from '@/shared/utils/cn';
import { Slot } from '@radix-ui/react-slot';
import { type ComponentProps } from 'react';

/**
 * 操作ボタン。子に lucide のアイコンを置くと 16px に揃え、文字との間隔は gap-2 で空ける。
 * 呼び手はアイコンに className を書かず、mr-2 や gap-2 も渡さない。
 * asChild で Link を包むとリンクをボタンの見た目にできる。
 */
type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'destructive-outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  asChild?: boolean;
};

export function Button({ className, variant = 'primary', size = 'md', asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition disabled:opacity-50 disabled:pointer-events-none active:scale-[.96] [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0';

  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed',
    secondary:
      'bg-white text-text-main border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed',
    outline:
      'bg-transparent border border-gray-200 text-text-main hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'bg-transparent text-text-main hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
    destructive: 'bg-error text-white hover:bg-error/90 disabled:opacity-50 disabled:cursor-not-allowed',
    'destructive-outline':
      'bg-transparent border border-error-ring text-error hover:bg-error-soft disabled:opacity-50 disabled:cursor-not-allowed',
  };

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
    icon: 'h-10 w-10 text-sm',
  };

  return <Comp className={cn(baseStyles, variants[variant], sizes[size], className)} {...props} />;
}
