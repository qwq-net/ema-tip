import { Badge } from '@/shared/ui';
import type { HorseSource } from '../types';

// 登録元バッジ。Netkeiba 取り込みは青、手動登録はグレーで表示する。
export function HorseSourceBadge({ source }: { source: HorseSource }) {
  return (
    <Badge
      label={source === 'NETKEIBA' ? 'Netkeiba' : '手動'}
      className={
        source === 'NETKEIBA' ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-gray-100 text-gray-600 ring-gray-200'
      }
    />
  );
}
