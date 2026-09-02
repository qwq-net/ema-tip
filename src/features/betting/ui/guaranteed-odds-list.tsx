import { BET_TYPE_LABELS, BET_TYPE_ORDER } from '@/entities/bet';

interface GuaranteedOddsListProps {
  guaranteedOdds: Record<string, number>;
}

// 券種ごとの保証倍率を券種定義順のグリッドで表示する。倍率未設定の券種は表示しない
export function GuaranteedOddsList({ guaranteedOdds }: GuaranteedOddsListProps) {
  const types = BET_TYPE_ORDER.filter((type) => guaranteedOdds[type] !== undefined);

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {types.map((type) => (
        <div key={type} className="rounded-control bg-gray-50 px-3 py-2 ring-1 ring-gray-100 ring-inset">
          <dt className="text-sm text-gray-500">{BET_TYPE_LABELS[type]}</dt>
          <dd className="text-base font-semibold text-gray-900">{guaranteedOdds[type].toFixed(1)}倍</dd>
        </div>
      ))}
    </dl>
  );
}
