import { cn } from '@/shared/utils/cn';
import type { ReactNode } from 'react';

const WIDTHS = {
  full: '',
  narrow: 'mx-auto max-w-2xl',
  medium: 'mx-auto max-w-4xl',
} as const;

/**
 * 管理ページの外枠。子要素を space-y-6 で縦に並べる。管理シェルの main が余白を持つので、
 * ここでは py や mb の包みを足さない。full は一覧と詳細、narrow は登録・編集、medium は項目の多いフォーム。
 */
export function AdminPage({ width = 'full', children }: { width?: keyof typeof WIDTHS; children: ReactNode }) {
  return <div className={cn('space-y-6', WIDTHS[width])}>{children}</div>;
}
