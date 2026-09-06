import { getDisplayStatus } from '@/entities/race/lib/status';
import { RaceListTable } from '@/entities/race/ui/race-list-table';
import { getRaceBetSummaries, type RaceBetSummary } from '@/features/admin/manage-bets/actions/read';
import { AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { db } from '@/shared/db';
import { raceInstances } from '@/shared/db/schema';
import { Badge, Button, Card } from '@/shared/ui';
import { asc, eq } from 'drizzle-orm';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'イベントのレース',
};

const EMPTY_SUMMARY: RaceBetSummary = { betCount: 0, totalAmount: 0, totalPayout: 0 };

/** 金額を円表記にする。 */
function yen(value: number): string {
  return `${value.toLocaleString('ja-JP')}円`;
}

/**
 * イベント配下のレース一覧。レースごとの馬券の件数・投票額・払戻額を列に持ち、上部に合計を出すことで
 * イベント単位の馬券ダッシュボードを兼ねる。レース名から確定画面へ、末尾列から出走馬タブへ移動できる。
 */
export default async function EventRacesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [races, summaries] = await Promise.all([
    db.query.raceInstances.findMany({
      where: eq(raceInstances.eventId, id),
      columns: { id: true, name: true, raceNumber: true, distance: true, surface: true, condition: true, status: true },
      with: {
        // 表の幅を抑えるため会場は略称で出す
        venue: { columns: { shortName: true } },
        // 状態バッジと頭数の表示にだけ使うため、entries は必要なカラムだけ返す
        entries: { columns: { finishPosition: true, status: true } },
      },
      orderBy: [asc(raceInstances.raceNumber), asc(raceInstances.name)],
    }),
    getRaceBetSummaries(id),
  ]);
  const summaryOf = (raceId: string) => summaries.get(raceId) ?? EMPTY_SUMMARY;
  const total = races.reduce(
    (acc, race) => {
      const s = summaryOf(race.id);
      return {
        betCount: acc.betCount + s.betCount,
        totalAmount: acc.totalAmount + s.totalAmount,
        totalPayout: acc.totalPayout + s.totalPayout,
      };
    },
    { ...EMPTY_SUMMARY }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-baseline gap-4">
          <AdminSectionTitle>レース一覧</AdminSectionTitle>
          <span className="text-sm text-gray-500">
            馬券 {total.betCount}枚 / 投票 {yen(total.totalAmount)} / 払戻 {yen(total.totalPayout)}
          </span>
        </div>
        <Button asChild className="flex items-center gap-2 font-semibold transition active:scale-[.96]">
          <Link href={`/admin/races/new?eventId=${id}`}>
            <Plus className="h-4 w-4" />
            レースを追加
          </Link>
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <RaceListTable
          races={races}
          hrefFor={(race) => `/admin/races/${race.id}`}
          tail={[
            {
              header: '馬券 / 投票額',
              className: 'text-right',
              cell: (race) => `${summaryOf(race.id).betCount}枚 / ${yen(summaryOf(race.id).totalAmount)}`,
            },
            { header: '払戻額', className: 'text-right', cell: (race) => yen(summaryOf(race.id).totalPayout) },
            {
              header: '状態',
              cell: (race) => (
                <div className="flex items-center gap-3">
                  <Badge
                    variant="status"
                    label={getDisplayStatus(
                      race.status,
                      race.entries.some((e) => e.finishPosition !== null)
                    )}
                  />
                  <Link
                    href={`/admin/races/${race.id}/entries`}
                    className="text-sm font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900"
                  >
                    出走馬 {race.entries.filter((e) => e.status === 'ENTRANT').length}頭
                  </Link>
                </div>
              ),
            },
          ]}
          emptyMessage="このイベントにはまだレースがありません"
        />
      </Card>
    </div>
  );
}
