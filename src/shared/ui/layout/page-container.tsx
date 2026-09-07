import { cn } from '@/shared/utils/cn';
import type { ReactNode } from 'react';

const WIDTHS = {
  wide: 'max-w-5xl',
  narrow: 'max-w-2xl',
} as const;

/**
 * 利用者側ページの外枠。画面余白と最大幅と子要素の縦間隔をまとめて持つ。
 * 利用者側シェルの main は余白を持たないため、ページはこの部品を最上位に置く。
 * 管理シェルの main は自前で余白を持つので、管理ページには使わない。
 */
export function PageContainer({
  width = 'wide',
  className,
  children,
}: {
  width?: keyof typeof WIDTHS;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center p-4 lg:p-8">
      <div className={cn('w-full space-y-8', WIDTHS[width], className)}>{children}</div>
    </div>
  );
}
