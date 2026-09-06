'use server';

import type { BetType } from '@/entities/bet';
import { db } from '@/shared/db';
import { betGroups, bets, raceInstances, users } from '@/shared/db/schema';
import { requireAdmin } from '@/shared/utils/admin';
import { and, asc, count, countDistinct, desc, eq, ilike, inArray, type SQL, sql, sum } from 'drizzle-orm';
import { BET_GROUP_PAGE_SIZE, type BetGroupListParams, type BetGroupStatus } from '../lib/list-params';

export interface RaceBetSummary {
  betCount: number;
  totalAmount: number;
  totalPayout: number;
}

/**
 * イベント配下のレースごとに馬券の件数・投票額・払戻額を集計して raceId をキーに返す。
 * 馬券のないレースはキーを持たないため、呼び手はゼロ埋めして扱う。
 */
export async function getRaceBetSummaries(eventId: string): Promise<Map<string, RaceBetSummary>> {
  await requireAdmin();

  const rows = await db
    .select({
      raceId: bets.raceId,
      betCount: count(),
      totalAmount: sum(bets.amount),
      totalPayout: sql<string>`coalesce(sum(${bets.payout}), 0)`,
    })
    .from(bets)
    .innerJoin(raceInstances, eq(bets.raceId, raceInstances.id))
    .where(eq(raceInstances.eventId, eventId))
    .groupBy(bets.raceId);

  return new Map(
    rows.map((row) => [
      row.raceId,
      { betCount: row.betCount, totalAmount: Number(row.totalAmount ?? 0), totalPayout: Number(row.totalPayout) },
    ])
  );
}

interface RaceBetOverview {
  buyerCount: number;
  purchaseCount: number;
  betCount: number;
  totalAmount: number;
  totalPayout: number;
  hitCount: number;
}

/** レース全体の馬券の概況。絞り込みの影響を受けない上部集計に使う。 */
export async function getRaceBetOverview(raceId: string): Promise<RaceBetOverview> {
  await requireAdmin();

  const [groupRows, betRows] = await Promise.all([
    db
      .select({
        buyerCount: countDistinct(betGroups.userId),
        purchaseCount: count(),
        totalAmount: sum(betGroups.totalAmount),
      })
      .from(betGroups)
      .where(eq(betGroups.raceId, raceId)),
    db
      .select({
        betCount: count(),
        totalPayout: sql<string>`coalesce(sum(${bets.payout}), 0)`,
        hitCount: sql<number>`count(*) filter (where ${bets.status} = 'HIT')`.mapWith(Number),
      })
      .from(bets)
      .where(eq(bets.raceId, raceId)),
  ]);
  const groups = groupRows[0];
  const betAgg = betRows[0];

  return {
    buyerCount: groups?.buyerCount ?? 0,
    purchaseCount: groups?.purchaseCount ?? 0,
    totalAmount: Number(groups?.totalAmount ?? 0),
    betCount: betAgg?.betCount ?? 0,
    totalPayout: Number(betAgg?.totalPayout ?? 0),
    hitCount: betAgg?.hitCount ?? 0,
  };
}

export interface BetGroupRow {
  id: string;
  createdAt: Date;
  userName: string;
  type: BetType;
  totalAmount: number;
  betCount: number;
  hitCount: number;
  payout: number;
  status: BetGroupStatus;
  /** 桁ごとの選択馬番。1 桁目から順に並ぶ。 */
  positions: number[][];
  /** 的中した組み合わせと払戻額。払戻確定前は空。 */
  hits: { selections: number[]; payout: number }[];
}

interface BetGroupPage {
  rows: BetGroupRow[];
  total: number;
}

// ILIKE のワイルドカードを文字として検索できるようにする
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * レースの購入一覧を購入 1 回 = 1 行で、検索条件と並び順を反映して 1 ページ分返す。
 * 行の状態は配下の馬券から導く。1 点でも的中なら的中、全て未確定なら未確定、全て返還なら返還、それ以外は不的中。
 * 買い目は桁ごとの馬番の和集合を SQL で畳み、組み合わせ行そのものは取得しない。
 *
 * 性能の実測。1 レースに購入 9,000 回・馬券 20 万点を入れた状態で、行取得 37ms・件数 33ms、
 * 買い目の畳み込みと的中取得は bet_group_idx 経由で合計 2ms。
 * ponytail: 状態の絞り込みと払戻の並び替えに備えて全馬券を集約している。
 * 想定規模では十分だが、遅くなったら状態・払戻を使わない条件のときだけ 50 件に絞ってから集約する
 */
export async function getRaceBetGroupPage(raceId: string, params: BetGroupListParams): Promise<BetGroupPage> {
  await requireAdmin();

  const agg = db
    .select({
      groupId: bets.betGroupId,
      betCount: count().as('bet_count'),
      hitCount: sql<number>`count(*) filter (where ${bets.status} = 'HIT')`.mapWith(Number).as('hit_count'),
      payout: sql<number>`coalesce(sum(${bets.payout}), 0)`.mapWith(Number).as('group_payout'),
      status: sql<BetGroupStatus>`case
        when bool_or(${bets.status} = 'HIT') then 'HIT'
        when bool_and(${bets.status} = 'PENDING') then 'PENDING'
        when bool_and(${bets.status} = 'REFUNDED') then 'REFUNDED'
        else 'LOST' end`.as('group_status'),
    })
    .from(bets)
    .where(eq(bets.raceId, raceId))
    .groupBy(bets.betGroupId)
    .as('agg');

  const conditions: SQL[] = [eq(betGroups.raceId, raceId)];
  if (params.type) conditions.push(eq(betGroups.type, params.type));
  if (params.status) conditions.push(eq(agg.status, params.status));
  if (params.q) conditions.push(ilike(users.name, `%${escapeLike(params.q)}%`));
  const where = and(...conditions);

  const sortColumn = { createdAt: betGroups.createdAt, amount: betGroups.totalAmount, payout: agg.payout }[params.sort];
  const direction = params.dir === 'asc' ? asc : desc;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: betGroups.id,
        createdAt: betGroups.createdAt,
        userName: users.name,
        type: betGroups.type,
        totalAmount: betGroups.totalAmount,
        betCount: agg.betCount,
        hitCount: agg.hitCount,
        payout: agg.payout,
        status: agg.status,
      })
      .from(betGroups)
      .innerJoin(users, eq(users.id, betGroups.userId))
      .innerJoin(agg, eq(agg.groupId, betGroups.id))
      .where(where)
      .orderBy(
        ...(params.sort === 'createdAt' ? [direction(sortColumn)] : [direction(sortColumn), desc(betGroups.createdAt)])
      )
      .limit(BET_GROUP_PAGE_SIZE)
      .offset((params.page - 1) * BET_GROUP_PAGE_SIZE),
    db
      .select({ value: count() })
      .from(betGroups)
      .innerJoin(users, eq(users.id, betGroups.userId))
      .innerJoin(agg, eq(agg.groupId, betGroups.id))
      .where(where),
  ]);

  const groupIds = rows.map((row) => row.id);
  const [positionRows, hitRows] = groupIds.length
    ? await Promise.all([
        db
          .select({
            groupId: bets.betGroupId,
            p0: sql<number[]>`array_remove(array_agg(distinct (${bets.details}->'selections'->>0)::int), null)`,
            p1: sql<number[]>`array_remove(array_agg(distinct (${bets.details}->'selections'->>1)::int), null)`,
            p2: sql<number[]>`array_remove(array_agg(distinct (${bets.details}->'selections'->>2)::int), null)`,
          })
          .from(bets)
          .where(inArray(bets.betGroupId, groupIds))
          .groupBy(bets.betGroupId),
        db
          .select({ groupId: bets.betGroupId, details: bets.details, payout: bets.payout })
          .from(bets)
          .where(and(inArray(bets.betGroupId, groupIds), eq(bets.status, 'HIT')))
          .orderBy(asc(bets.createdAt)),
      ])
    : [[], []];

  const positionsByGroup = new Map(
    positionRows.map((row) => [
      row.groupId,
      [row.p0, row.p1, row.p2].filter((p) => p.length > 0).map((p) => p.map(Number).sort((a, b) => a - b)),
    ])
  );
  const hitsByGroup = new Map<string, BetGroupRow['hits']>();
  for (const hit of hitRows) {
    const list = hitsByGroup.get(hit.groupId) ?? [];
    list.push({ selections: hit.details.selections, payout: hit.payout ?? 0 });
    hitsByGroup.set(hit.groupId, list);
  }

  return {
    rows: rows.map((row) => ({
      ...row,
      userName: row.userName ?? '',
      positions: positionsByGroup.get(row.id) ?? [],
      hits: hitsByGroup.get(row.id) ?? [],
    })),
    total: totalRows[0]?.value ?? 0,
  };
}
