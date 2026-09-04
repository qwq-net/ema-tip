import { lookup } from '@/shared/utils/lookup';
import { BET_TYPES, BetDetail, BetType } from '../constants';
import { normalizeSelections } from './payout';

const EXPECTED_WINNER_COUNT = {
  [BET_TYPES.PLACE]: 3,
  [BET_TYPES.WIDE]: 3,
} satisfies Partial<Record<BetType, number>>;

export interface OddsPool {
  poolByBetType: Record<string, number>;
  amountBySelection: Record<string, Record<string, number>>;
  // 選択肢ごとのベット行数。人気順の同額タイブレークに使う
  countBySelection: Record<string, Record<string, number>>;
}

export function aggregateOddsPool(bets: { amount: number; details: BetDetail }[]): OddsPool {
  const poolByBetType: Record<string, number> = {};
  const amountBySelection: Record<string, Record<string, number>> = {};
  const countBySelection: Record<string, Record<string, number>> = {};

  for (const bet of bets) {
    const details = bet.details;
    const betType = details.type;
    const key = normalizeSelections(betType, details.selections);

    poolByBetType[betType] = (poolByBetType[betType] || 0) + bet.amount;
    if (!amountBySelection[betType]) amountBySelection[betType] = {};
    amountBySelection[betType][key] = (amountBySelection[betType][key] || 0) + bet.amount;
    if (!countBySelection[betType]) countBySelection[betType] = {};
    countBySelection[betType][key] = (countBySelection[betType][key] || 0) + 1;
  }

  return { poolByBetType, amountBySelection, countBySelection };
}

// 賭け金額から人気順を導く。金額の多い順に1から重複なく振り、同額は購入件数が多い方を、
// それも同じなら選択肢キーの数値が小さい方を上位にして全順位を一意にする。
// 金額ゼロや未購入の選択肢は結果に含まれない。
// 表示オッズは0.1単位へ切り捨てられ異なる支持率が同値に潰れるため、丸め前の金額を正とする
export function calculateWinPopularity(
  amountBySelection: Record<string, number>,
  countBySelection: Record<string, number> = {}
) {
  const selectionNumber = (key: string) => {
    // SAFETY: key は normalizeSelections が number[] を JSON.stringify したもの
    const parsed = JSON.parse(key) as number[];
    return parsed[0] ?? Number.MAX_SAFE_INTEGER;
  };
  const entries = Object.entries(amountBySelection).filter(([, amount]) => amount > 0);
  entries.sort(
    ([keyA, amountA], [keyB, amountB]) =>
      amountB - amountA ||
      (countBySelection[keyB] ?? 0) - (countBySelection[keyA] ?? 0) ||
      selectionNumber(keyA) - selectionNumber(keyB)
  );

  const ranks: Record<string, number> = {};
  entries.forEach(([key], index) => {
    ranks[key] = index + 1;
  });
  return ranks;
}

export function calculateProvisionalOdds(pool: OddsPool, guaranteedOdds?: Record<string, number>) {
  const provisionalOdds: Record<string, Record<string, number>> = {};

  for (const [type, totalAmount] of Object.entries(pool.poolByBetType)) {
    provisionalOdds[type] = {};
    const selections = pool.amountBySelection[type];
    const expectedWinners = lookup(EXPECTED_WINNER_COUNT, type) ?? 1;
    const effectivePool = totalAmount / expectedWinners;

    for (const [key, amount] of Object.entries(selections)) {
      if (amount === 0) continue;

      let rate = effectivePool / amount;
      rate = Math.floor(rate * 10) / 10;

      if (guaranteedOdds && guaranteedOdds[type]) {
        rate = Math.max(rate, guaranteedOdds[type]);
      }

      if (rate < 1.1) rate = 1.1;
      provisionalOdds[type][key] = rate;
    }
  }

  return provisionalOdds;
}
