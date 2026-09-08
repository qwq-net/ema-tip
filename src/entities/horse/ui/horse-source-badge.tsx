import { Badge } from '@/shared/ui';
import type { HorseSource } from '../types';

// 登録元バッジ。Netkeiba 取り込みと手動登録を語だけで区別します。
export function HorseSourceBadge({ source }: { source: HorseSource }) {
  return <Badge label={source === 'NETKEIBA' ? 'Netkeiba' : '手動'} />;
}
