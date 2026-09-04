import { cn } from '@/shared/utils/cn';
import type { LucideIcon } from 'lucide-react';

const VARIANT_CLASSES = {
  success: 'bg-success-soft text-success ring-success-ring',
  warning: 'bg-warning-soft text-warning ring-warning-ring',
  error: 'bg-error-soft text-error ring-error-ring',
  info: 'bg-info-soft text-info ring-info-ring',
} as const;

interface AlertProps {
  variant: keyof typeof VARIANT_CLASSES;
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
}

// 意味色の帯型メッセージ。締切・警告・案内などページ内の状態通知はこれを使い、
// 意味色の面や文字をコンポーネントへ直書きしない。色は @theme の意味トークンが単一管理点
export function Alert({ variant, icon: Icon, className, children }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-control flex items-center gap-2 p-3 text-sm font-semibold ring-1',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {children}
    </div>
  );
}
