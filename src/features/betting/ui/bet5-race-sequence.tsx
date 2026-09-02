import { cn } from '@/shared/utils/cn';
import { ChevronRight } from 'lucide-react';

/**
 * BET5 の対象レース番号列。各画面共通のレース番号チップを進行順にシェブロンで連結して表示する。
 * 区切りアイコンは currentColor 依存なので、暗い面では親側で明るい文字色を指定する前提。
 */
export function Bet5RaceSequence({ raceNumbers, className }: { raceNumbers: (number | null)[]; className?: string }) {
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      {raceNumbers.map((raceNumber, index) => (
        <span key={index} className="inline-flex items-center gap-1.5">
          {index > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
          <span className="rounded-chip flex h-5 w-7 items-center justify-center bg-gray-100 text-sm font-semibold text-gray-600">
            {raceNumber ?? '-'}R
          </span>
        </span>
      ))}
    </span>
  );
}
