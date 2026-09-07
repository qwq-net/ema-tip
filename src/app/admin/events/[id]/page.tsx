import { getDisplayStatus } from '@/entities/race/lib/status';
import { RaceListTable } from '@/entities/race/ui/race-list-table';
import { getRaceBetSummaries, type RaceBetSummary } from '@/features/admin/manage-bets/actions/read';
import { getEvent } from '@/features/admin/manage-events/actions';
import { type EventNextStep, getEventNextStep } from '@/features/admin/manage-events/lib/event-next-step';
import { EventStatusAction, FINISH_CONFIRM } from '@/features/admin/manage-events/ui/event-status-control';
import { AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { db } from '@/shared/db';
import { raceInstances } from '@/shared/db/schema';
import { Badge, Button, Card } from '@/shared/ui';
import { formatYen } from '@/shared/utils/format-yen';
import { asc, eq } from 'drizzle-orm';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'イベントのレース',
};

const EMPTY_SUMMARY: RaceBetSummary = { betCount: 0, totalAmount: 0, totalPayout: 0 };

// やるべき瞬間にだけ出す案内。常設にせず、条件を満たしたときだけ表示する
const NEXT_STEP_MESSAGES = {
  start: 'レースと出走馬の準備が整いました。開始すると参加者が参加登録と馬券購入をできるようになります。',
  finish: 'すべてのレースの払戻が確定しました。ランキングを確認してイベントを終了してください。',
} satisfies Record<EventNextStep, string>;

/**
 * イベント配下のレース一覧。レースごとの馬券の件数・投票額・払戻額を列に持ち、上部に合計を出すことで
 * イベント単位の馬券ダッシュボードを兼ねる。レース名から確定画面へ、末尾列から出走馬タブへ移動できる。
 */
export default async function EventRacesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, races, summaries] = await Promise.all([
    getEvent(id),
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
  if (!event) {
    notFound();
  }
  const entrantCountOf = (race: (typeof races)[number]) => race.entries.filter((e) => e.status === 'ENTRANT').length;
  const nextStep = getEventNextStep(
    event.status,
    races.map((race) => ({ status: race.status, entrantCount: entrantCountOf(race) }))
  );
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
      {nextStep && (
        <div className="rounded-control border-turf-100 bg-turf-50/70 flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-700">{NEXT_STEP_MESSAGES[nextStep]}</p>
          <div className="flex shrink-0 items-center gap-2">
            {nextStep === 'start' && (
              <EventStatusAction
                eventId={id}
                next="ACTIVE"
                label="イベントを開始する"
                icon="play"
                variant="primary"
                done="イベントを開始しました"
              />
            )}
            {nextStep === 'finish' && (
              <>
                <Button asChild variant="outline">
                  <Link href={`/admin/events/${id}/ranking`}>ランキングを確認</Link>
                </Button>
                <EventStatusAction
                  eventId={id}
                  next="COMPLETED"
                  label="イベントを終了する"
                  icon="stop"
                  variant="outline"
                  done="イベントを終了しました"
                  confirm={FINISH_CONFIRM}
                />
              </>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-baseline gap-4">
          <AdminSectionTitle>レース一覧</AdminSectionTitle>
          <span className="text-text-sub text-sm">
            馬券 {total.betCount}枚 / 投票 {formatYen(total.totalAmount)} / 払戻 {formatYen(total.totalPayout)}
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
              cell: (race) => `${summaryOf(race.id).betCount}枚 / ${formatYen(summaryOf(race.id).totalAmount)}`,
            },
            { header: '払戻額', className: 'text-right', cell: (race) => formatYen(summaryOf(race.id).totalPayout) },
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
                    className="hover:text-text-main text-sm text-gray-600 underline underline-offset-2"
                  >
                    出走馬 {entrantCountOf(race)}頭
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
