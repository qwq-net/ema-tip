import { cn } from '@/shared/utils/cn';
import type { ComponentProps, ReactNode } from 'react';

/**
 * 一覧テーブルの標準スタイル一式。TableShell > TableHead / TableBody > TableRow > Th / Td で組む。
 * TableShell は横スクロール可能な枠付きカードとして描画するため、親側での枠・overflow 指定は不要。
 */
export function TableShell({ className, children, ...props }: ComponentProps<'table'>) {
  return (
    <div className="rounded-surface overflow-x-auto border border-gray-200 bg-white">
      <table className={cn('w-full min-w-[800px] border-collapse', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

/** thead と見出し行をまとめて描画する。children には Th を並べる。 */
export function TableHead({ className, children, ...props }: ComponentProps<'tr'>) {
  return (
    <thead className="bg-gray-50">
      <tr className={cn('border-b border-gray-100', className)} {...props}>
        {children}
      </tr>
    </thead>
  );
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'text-text-sub px-6 py-4 text-left text-sm font-medium tracking-wider whitespace-nowrap uppercase',
        className
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody className={cn('divide-y divide-gray-100 bg-white', className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={cn('transition-colors hover:bg-gray-50', className)} {...props} />;
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-6 py-4 text-sm whitespace-nowrap', className)} {...props} />;
}

/** 0 件時に TableBody 内へ置く行。colSpan には列数を渡す。 */
export function TableEmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-text-sub px-6 py-12 text-center text-sm font-medium">
        {children}
      </td>
    </tr>
  );
}
