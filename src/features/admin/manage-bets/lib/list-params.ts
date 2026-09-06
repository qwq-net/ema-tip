import { BET_TYPE_ORDER } from '@/entities/bet';
import { lookup } from '@/shared/utils/lookup';
import { z } from 'zod';

export const BET_GROUP_PAGE_SIZE = 50;

export const BET_GROUP_STATUSES = ['PENDING', 'HIT', 'LOST', 'REFUNDED'] as const;
export type BetGroupStatus = (typeof BET_GROUP_STATUSES)[number];

export const BET_GROUP_SORT_KEYS = ['createdAt', 'amount', 'payout'] as const;
export type BetGroupSortKey = (typeof BET_GROUP_SORT_KEYS)[number];

// 不正値は例外にせず既定へ倒す。URL を手で書き換えても一覧が壊れないようにする
const ListParamsSchema = z.object({
  q: z.string().trim().max(50).optional().catch(undefined),
  type: z.enum(BET_TYPE_ORDER).optional().catch(undefined),
  status: z.enum(BET_GROUP_STATUSES).optional().catch(undefined),
  sort: z.enum(BET_GROUP_SORT_KEYS).catch('createdAt'),
  dir: z.enum(['asc', 'desc']).catch('desc'),
  page: z.coerce.number().int().min(1).catch(1),
});

export type BetGroupListParams = z.infer<typeof ListParamsSchema>;

const LIST_PARAM_DEFAULTS = { sort: 'createdAt', dir: 'desc', page: 1 } satisfies Partial<BetGroupListParams>;

/**
 * 馬券タブの検索条件を URL クエリから組み立てる。同名キーが複数あれば先頭を採用する。
 * GET フォームは未選択でも空文字を送るため空文字は未指定として扱い、不正な値は項目ごとに既定へ倒す。
 */
export function parseBetGroupListParams(
  searchParams: Record<string, string | string[] | undefined>
): BetGroupListParams {
  const flat = Object.fromEntries(
    Object.entries(searchParams)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value] as const)
      .filter(([, value]) => value !== undefined && value !== '')
  );
  return ListParamsSchema.parse(flat);
}

/**
 * 現在の条件に差分を重ねてクエリ文字列を作る。undefined を渡したキーは落とし、既定値と同じ項目は書かない。
 * 並び替えや絞り込みを変えたときはページを 1 に戻す。
 */
export function buildBetGroupListQuery(
  current: BetGroupListParams,
  patch: Partial<Record<keyof BetGroupListParams, string | number | undefined>>
): string {
  const merged = { ...current, ...patch, page: 'page' in patch ? patch.page : 1 };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === '' || lookup(LIST_PARAM_DEFAULTS, key) === value) continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}
