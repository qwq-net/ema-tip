import {
  AssetChart,
  CurrentBalanceDisplay,
  EventStatsCard,
  type getGlobalStats,
  KarmaDisplay,
  NetWorthDisplay,
} from '@/features/stats';
import { Card, CardContent, CardHeader, CardTitle, EmptyState, SectionTitle } from '@/shared/ui';
import { History } from 'lucide-react';

/**
 * 戦績ダッシュボードの本体。所持金の指標・全期間の資産推移・イベント別の内訳を縦に並べる。
 * 借入が無い利用者にはカルマと純資産を出さない。ページ側は見出しとデータ取得だけを持つ。
 */
export function StatsDashboard({ stats }: { stats: Awaited<ReturnType<typeof getGlobalStats>> }) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CurrentBalanceDisplay amount={stats.totalBalance} />
        {stats.totalLoan > 0 && (
          <>
            <KarmaDisplay totalKarma={stats.totalLoan} />
            <NetWorthDisplay amount={stats.totalNet} />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2">全期間資産推移</CardTitle>
        </CardHeader>
        <CardContent>
          <AssetChart data={stats.globalHistory} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <SectionTitle>イベント別詳細</SectionTitle>
        {stats.events.length === 0 ? (
          <EmptyState icon={History} title="参加したイベントはまだありません" />
        ) : (
          stats.events.map((event) => <EventStatsCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}
