import { BET_TYPE_ORDER } from '@/entities/bet';
import { db } from '@/shared/db';
import { z } from 'zod';

export const MIN_GUARANTEED_ODDS = 1.1;

const rateSchema = z.number().min(MIN_GUARANTEED_ODDS, `保証オッズは ${MIN_GUARANTEED_ODDS} 倍以上で入力してください`);

// レース単位の上書き。券種キーだけを許し、載っていない券種はデフォルトを使う意味になる
export const guaranteedOddsOverrideSchema = z.record(z.enum(BET_TYPE_ORDER), rateSchema);

// システム既定値。未上書きレースの最後の受け皿なので全券種が揃っていることを要求する
export const defaultGuaranteedOddsSchema = guaranteedOddsOverrideSchema.refine(
  (odds) => BET_TYPE_ORDER.every((type) => type in odds),
  '全ての券種の保証オッズを入力してください'
);

// レースの上書きをデフォルトへ重ねた実効保証オッズを返す。上書きは券種キーの有無で判定する。
// どちらにも無い券種は結果に含まれず、呼び手は「その券種に保証なし」として扱う。
export function resolveGuaranteedOdds(
  defaults: Record<string, number>,
  overrides: Record<string, number> | null | undefined
) {
  return { ...defaults, ...overrides };
}

// guaranteed_odds_master を券種キー → 倍率の Record にして返す。
// トランザクション内で確定計算と同じスナップショットを読むため、実行主体を差し替えられる
export async function getDefaultGuaranteedOdds(
  executor: Pick<typeof db, 'query'> = db
): Promise<Record<string, number>> {
  const rows = await executor.query.guaranteedOddsMaster.findMany();
  return Object.fromEntries(rows.map((row) => [row.key, Number(row.odds)]));
}
