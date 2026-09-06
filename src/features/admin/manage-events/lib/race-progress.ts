/**
 * イベント配下のレース状態から進行状況の 1 行を作る。
 * 「5 レース中 2 レース払戻確定・1 レース締切済み」の形で、締切済みが 0 ならその句は出さない。
 * レースが 1 件もなければ「レース未登録」を返す。
 */
export function describeRaceProgress(statuses: readonly string[]): string {
  const total = statuses.length;
  if (total === 0) return 'レース未登録';
  const finalized = statuses.filter((s) => s === 'FINALIZED').length;
  const closed = statuses.filter((s) => s === 'CLOSED').length;
  const parts = [`${total} レース中 ${finalized} レース払戻確定`];
  if (closed > 0) parts.push(`${closed} レース締切済み`);
  return parts.join('・');
}
