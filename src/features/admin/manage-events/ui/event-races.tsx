import { getDisplayStatus } from '@/entities/race/lib/status';
import { RaceListTable } from '@/entities/race/ui/race-list-table';
import type { RaceBetSummary } from '@/features/admin/manage-bets/actions/read';
import { type EventNextStep, getEventNextStep } from '@/features/admin/manage-events/lib/event-next-step';
import { EventStatusAction, FINISH_CONFIRM } from '@/features/admin/manage-events/ui/event-status-control';
import { Badge, Button, Card, SectionTitle } from '@/shared/ui';
import { formatYen } from '@/shared/utils/format-yen';
import { Plus } from 'lucide-react';
import Link from 'next/link';

const EMPTY_SUMMARY: RaceBetSummary = { betCount: 0, totalAmount: 0, totalPayout: 0 };

// やるべき瞬間にだけ出す案内。常設にせず、条件を満たしたときだけ表示する
const NEXT_STEP_MESSAGES = {
  start: 'レースと出走馬の準備が整いました。開始すると参加者が参加登録と馬券購入をできるようになります。',
  finish: 'すべてのレースの払戻が確定しました。ランキングを確認してイベントを終了してください。',
} satisfies Record<EventNextStep, string>;

interface EventRace {
  id: string;
  name: string;
  raceNumber: number | null;
  distance: number;
  surface: string;
  condition: string | null;
  status: string;
  venue: { shortName: string } | null;
  entries: { finishPosition: number | null; status: string }[];
}

/** いま進めるべき操作の案内バナー。開始と終了のどちらを促すかは nextStep が決める。 */
function NextStepBanner({ eventId, nextStep }: { eventId: string; nextStep: EventNextStep }) {
  return (
    <div className="rounded-control border-turf-100 bg-turf-50/70 flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-700">{NEXT_STEP_MESSAGES[nextStep]}</p>
      <div className="flex shrink-0 items-center gap-2">
        {nextStep === 'start' && (
          <EventStatusAction
            eventId={eventId}
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
              <Link href={`/admin/events/${eventId}/ranking`}>ランキングを確認</Link>
            </Button>
            <EventStatusAction
              eventId={eventId}
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
  );
}

interface EventRacesProps {
  eventId: string;
  eventStatus: string;
  races: EventRace[];
  /** レース ID ごとの馬券集計。集計が無いレースは 0 として扱う。 */
  summaries: Map<string, RaceBetSummary>;
}

/**
 * イベント配下のレース一覧。レースごとの馬券の件数・投票額・払戻額を列に持ち、上部に合計を出すことで
 * イベント単位の馬券ダッシュボードを兼ねる。レース名から確定画面へ、末尾列から出走馬タブへ移動できる。
 * 見出しとタブは親レイアウトが持つため、この部品は本文だけを組む。
 */
export function EventRaces({ eventId, eventStatus, races, summaries }: EventRacesProps) {
  const entrantCountOf = (race: EventRace) => race.entries.filter((e) => e.status === 'ENTRANT').length;
  const summaryOf = (raceId: string) => summaries.get(raceId) ?? EMPTY_SUMMARY;
  const nextStep = getEventNextStep(
    eventStatus,
    races.map((race) => ({ status: race.status, entrantCount: entrantCountOf(race) }))
  );
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
      {nextStep && <NextStepBanner eventId={eventId} nextStep={nextStep} />}
      <div className="space-y-1">
        <SectionTitle
          actions={
            <Button asChild>
              <Link href={`/admin/races/new?eventId=${eventId}`}>
                <Plus />
                レースを追加
              </Link>
            </Button>
          }
        >
          レース一覧
        </SectionTitle>
        <p className="text-text-sub text-sm">
          馬券 {total.betCount}枚 / 投票 {formatYen(total.totalAmount)} / 払戻 {formatYen(total.totalPayout)}
        </p>
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
