import { getBracketColor } from '@/shared/utils/bracket';
import { cn } from '@/shared/utils/cn';

interface BracketBadgeProps {
  bracketNumber: number | null;
  className?: string;
}

export function BracketBadge({ bracketNumber, className }: BracketBadgeProps) {
  return (
    <span
      className={cn(
        'rounded-chip inline-flex h-6 w-6 items-center justify-center text-sm font-semibold',
        getBracketColor(bracketNumber),
        className
      )}
    >
      {bracketNumber}
    </span>
  );
}
