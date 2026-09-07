import { BET_TYPE_LABELS, BET_TYPE_ORDER } from '@/entities/bet';

interface GuaranteedOddsListProps {
  guaranteedOdds: Record<string, number>;
}

// 券種ごとの保証倍率を券種定義順のグリッドで表示する。倍率未設定の券種は表示しない
export function GuaranteedOddsList({ guaranteedOdds }: GuaranteedOddsListProps) {
  const items = BET_TYPE_ORDER.flatMap((type) => {
    const rate = guaranteedOdds[type];
    return rate === undefined ? [] : [{ type, rate }];
  });

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(({ type, rate }) => (
        <div key={type} className="rounded-control bg-gray-50 px-3 py-2 ring-1 ring-gray-100 ring-inset">
          <dt className="text-text-sub text-sm">{BET_TYPE_LABELS[type]}</dt>
          <dd className="text-text-main text-base font-semibold">{rate.toFixed(1)}倍</dd>
        </div>
      ))}
    </dl>
  );
}
