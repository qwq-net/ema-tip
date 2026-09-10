import { updateGuaranteedOdds } from '@/features/admin/manage-races/actions/update-odds';
import type { RaceDetailData } from '@/features/admin/manage-races/queries/race-detail';
import { RaceBetTypesForm } from '@/features/admin/manage-races/ui/race-bet-types-form';
import { RaceInfoCard } from '@/features/admin/manage-races/ui/race-info-card';
import { RaceResultForm, type RaceResultFormRace } from '@/features/admin/manage-races/ui/race-result-form';
import { GuaranteedOddsForm } from '@/features/admin/shared/ui/guaranteed-odds-form';
import { medalRankClass } from '@/shared/constants/rank-medal';
import { Button, Card, CardContent, CardHeader, EmptyState, SectionTitle } from '@/shared/ui';
import { getBracketColor } from '@/shared/utils/bracket';
import { cn } from '@/shared/utils/cn';
import { Coins, Info, Trophy } from 'lucide-react';
import Link from 'next/link';

// 確定済み結果の着順バッジ色。1〜3着はランキングと共通の金銀銅、4着以下は淡色で出す。
// 枠線はどの順位でも中立のグレーで、色は地色と文字色だけで表す
function resultRankClass(index: number): string {
  return `border-gray-200 ${medalRankClass(index + 1) ?? 'text-text-sub bg-gray-50'}`;
}

type Race = RaceDetailData['race'];
type Entry = RaceDetailData['entries'][number];
type Bet5Event = NonNullable<RaceDetailData['bet5Event']>;

/** 出走前に BET5 の締切を促すかを返す。BET5 の対象レースで、かつ受付中のときだけ促す。 */
function shouldRemindBet5Close(bet5Event: Bet5Event | undefined, raceId: string): boolean {
  if (bet5Event === undefined) return false;
  const targetRaceIds = [bet5Event.race1Id, bet5Event.race2Id, bet5Event.race3Id, bet5Event.race4Id, bet5Event.race5Id];
  return targetRaceIds.includes(raceId) && bet5Event.status === 'SCHEDULED';
}

/** 払戻を確定できる状態かを返す。払戻結果が既にあるか、受付終了後に着順が入っていれば確定できる。 */
function canFinalizePayoutFor(payoutResultCount: number, status: string, hasFinishPositions: boolean): boolean {
  return payoutResultCount > 0 || (status === 'CLOSED' && hasFinishPositions);
}

/** レースの取得結果を着順設定フォームが求める形へ変換する。会場と締切は未設定でも描けるよう既定値へ倒す。 */
function toResultFormRace(race: Race): RaceResultFormRace {
  return {
    id: race.id,
    eventId: race.eventId,
    date: race.date,
    location: race.venue.name,
    name: race.name,
    raceNumber: race.raceNumber,
    status: race.status,
    surface: race.surface,
    distance: race.distance,
    condition: race.condition,
    closingAt: race.closingAt ? race.closingAt.toISOString() : null,
    netkeibaUrl: race.netkeibaUrl ?? null,
    fixedOddsMode: race.fixedOddsMode,
  };
}

/** 確定済み結果の 1 行。着順・枠番・馬番・馬名と、記録があれば騎手と単勝オッズを添える。 */
function FinalizedEntryRow({ entry, index, winOdds }: { entry: Entry; index: number; winOdds: number | undefined }) {
  return (
    <div className="group rounded-surface flex items-center gap-4 border border-gray-100 bg-white p-3 transition hover:border-gray-200">
      <div
        className={cn(
          'rounded-control flex h-10 w-10 shrink-0 items-center justify-center border text-xl font-semibold transition-colors',
          resultRankClass(index)
        )}
      >
        {index + 1}
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            'rounded-chip flex h-7 w-7 items-center justify-center text-sm font-semibold ring-1 ring-black/5',
            getBracketColor(entry.bracketNumber)
          )}
        >
          {entry.bracketNumber ?? '?'}
        </span>
        <span className="text-primary bg-primary/10 ring-primary/10 rounded-chip flex h-7 w-7 items-center justify-center text-sm font-semibold ring-1">
          {entry.horseNumber ?? '?'}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="text-text-main truncate text-base font-semibold">{entry.horseName}</span>
        {entry.jockey && (
          <>
            <span className="text-text-sub shrink-0 text-sm">/</span>
            <span className="text-text-sub shrink-0 text-sm">{entry.jockey}</span>
          </>
        )}
        {winOdds !== undefined && (
          <>
            <span className="text-text-sub shrink-0 text-sm">/</span>
            <span className="shrink-0 text-sm font-semibold text-gray-600">オッズ: {winOdds.toFixed(1)}倍</span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * レース詳細の確定・設定タブ。着順が確定していれば結果とレース情報を読み取り専用で出し、
 * 未確定なら着順設定フォームを主役に据える。出走馬が未登録のときは登録への案内だけを出す。
 * 見出しとタブは親レイアウトが持つため、この部品は本文だけを組む。
 */
export function RaceDetail({
  race,
  payoutResults,
  entries,
  oddsMap,
  oddsUpdatedAt,
  bet5Event,
  raceAllowed,
  eventDefault,
  defaultGuaranteedOdds,
}: RaceDetailData) {
  const isFinalized = race.status === 'FINALIZED';
  const hasFinishPositions = entries.some((e) => e.finishPosition !== null);
  const canFinalizePayout = canFinalizePayoutFor(payoutResults.length, race.status, hasFinishPositions);
  // 払戻表ができた後に保証オッズを変えると、計算済みの払戻と食い違うため編集を閉じる
  const isGuaranteedOddsLocked = isFinalized || payoutResults.length > 0;

  // 保存後の再マウント用に値を key にする。隣り合う 2 つのフォームは値が両方 null のとき key が重なるので接頭辞で区別する
  const settingCards = (
    <>
      {isGuaranteedOddsLocked ? (
        <Card>
          <CardHeader>
            <SectionTitle icon={Coins}>保証オッズ設定</SectionTitle>
          </CardHeader>
          <CardContent className="text-text-sub pt-6 text-sm">着順確定済みのため変更できません</CardContent>
        </Card>
      ) : (
        <GuaranteedOddsForm
          key={`guaranteed-odds-${JSON.stringify(race.guaranteedOdds)}`}
          title="保証オッズ設定"
          description="このレースだけ変える券種を 1.1 倍以上で入力します。空欄の券種はデフォルト設定の値を使い、その値を薄く表示しています。"
          initialOdds={race.guaranteedOdds ?? {}}
          placeholders={defaultGuaranteedOdds}
          action={updateGuaranteedOdds.bind(null, race.id)}
          successMessage="保証オッズを更新しました"
        />
      )}
      <RaceBetTypesForm
        key={`bet-types-${JSON.stringify(raceAllowed)}`}
        raceId={race.id}
        initialTypes={raceAllowed}
        eventDefaultTypes={eventDefault}
      />
    </>
  );

  if (isFinalized) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <SectionTitle icon={Trophy}>確定済み結果</SectionTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {entries.map((entry, index) => (
                <FinalizedEntryRow
                  key={entry.id}
                  entry={entry}
                  index={index}
                  winOdds={oddsMap[String(entry.horseNumber)]}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <RaceInfoCard
            status={race.status}
            surface={race.surface}
            distance={race.distance}
            condition={race.condition}
            finalizedAt={race.finalizedAt}
            netkeibaUrl={race.netkeibaUrl}
            fixedOddsMode={race.fixedOddsMode}
            oddsUpdatedAt={oddsUpdatedAt}
          />
          {settingCards}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Info}
          title="出走馬が登録されていません"
          description="レース結果を確定するには、まず出走馬を登録してください。"
          action={
            <Button asChild variant="outline">
              <Link href={`/admin/races/${race.id}/entries`}>出走馬を登録する</Link>
            </Button>
          }
        />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-start-3">{settingCards}</div>
        </div>
      </div>
    );
  }

  return (
    <RaceResultForm
      raceId={race.id}
      canFinalizePayout={canFinalizePayout}
      showBet5CloseReminder={shouldRemindBet5Close(bet5Event, race.id)}
      entries={entries.map((e) => ({
        id: e.id,
        horseNumber: e.horseNumber,
        horseName: e.horseName,
        bracketNumber: e.bracketNumber,
        jockey: e.jockey,
        odds: oddsMap[String(e.horseNumber)] ?? null,
      }))}
      race={toResultFormRace(race)}
      sideChildren={settingCards}
    />
  );
}
