import { Badge } from '@/shared/ui';
import type { HorseType } from '../types';

// 実在・架空の種別バッジ。REAL は緑、FICTIONAL は紫で表示する。
export function HorseTypeBadge({ type }: { type: HorseType }) {
  return (
    <Badge
      label={type === 'REAL' ? '実在' : '架空'}
      className={
        type === 'REAL' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-purple-50 text-purple-700 ring-purple-200'
      }
    />
  );
}
