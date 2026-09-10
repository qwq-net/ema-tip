import { getRaceBetGroupPage, getRaceBetOverview } from '@/features/admin/manage-bets/actions/read';
import {
  BET_GROUP_PAGE_SIZE,
  buildBetGroupListQuery,
  parseBetGroupListParams,
} from '@/features/admin/manage-bets/lib/list-params';
import { RaceBets } from '@/features/admin/manage-bets/ui/race-bets';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'レースの馬券',
};

export default async function RaceBetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, rawSearch] = await Promise.all([params, searchParams]);
  const listParams = parseBetGroupListParams(rawSearch);
  const basePath = `/admin/races/${id}/bets`;

  const [overview, page] = await Promise.all([getRaceBetOverview(id), getRaceBetGroupPage(id, listParams)]);
  // URL の page が末尾ページを超えていたら末尾ページへ送り直す。表示だけ丸めると表が空のまま件数範囲が末尾の値になる
  const lastPage = Math.max(1, Math.ceil(page.total / BET_GROUP_PAGE_SIZE));
  if (listParams.page > lastPage) {
    redirect(`${basePath}${buildBetGroupListQuery(listParams, { page: lastPage })}`);
  }

  return <RaceBets overview={overview} page={page} params={listParams} basePath={basePath} />;
}
