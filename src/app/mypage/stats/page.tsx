import {
  AssetChart,
  CurrentBalanceDisplay,
  EventStatsCard,
  getGlobalStats,
  KarmaDisplay,
  NetWorthDisplay,
} from '@/features/stats';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

export default async function StatsPage() {
  const stats = await getGlobalStats();

  return (
    <div className="flex flex-col items-center p-4 lg:p-8">
      <div className="w-full max-w-5xl space-y-8">
        <Breadcrumbs items={[{ label: 'マイページ', href: '/mypage' }, { label: '戦績ダッシュボード' }]} />
        <h1 className="text-3xl font-semibold text-gray-900">戦績ダッシュボード</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CurrentBalanceDisplay amount={stats.totalBalance} />
          {stats.totalLoan > 0 && (
            <>
              <KarmaDisplay totalKarma={stats.totalLoan} />
              <NetWorthDisplay amount={stats.totalNet} />
            </>
          )}
        </div>

        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>全期間資産推移</CardTitle>
          </CardHeader>
          <CardContent>
            <AssetChart data={stats.globalHistory} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">イベント別詳細</h2>
          {stats.events.length === 0 ? (
            <Card>
              <CardContent className="flex h-32 items-center justify-center text-gray-500">
                参加したイベントはまだありません
              </CardContent>
            </Card>
          ) : (
            stats.events.map((event) => <EventStatsCard key={event.id} event={event} />)
          )}
        </div>
      </div>
    </div>
  );
}
