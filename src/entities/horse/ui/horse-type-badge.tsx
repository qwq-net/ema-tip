import { Badge } from '@/shared/ui';
import type { HorseType } from '../types';

// 実在・架空の種別バッジ。語だけで区別します。
export function HorseTypeBadge({ type }: { type: HorseType }) {
  return <Badge label={type === 'REAL' ? '実在' : '架空'} />;
}
