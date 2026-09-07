import { toAllowedBetTypes } from '@/entities/bet';
import { getPayoutResults } from '@/entities/race/actions';
import { getDefaultGuaranteedOdds } from '@/entities/race/lib/guaranteed-odds';
import { getRaceById } from '@/features/admin/manage-entries/actions';
import { updateGuaranteedOdds } from '@/features/admin/manage-races/actions/update-odds';
import { RaceBetTypesForm } from '@/features/admin/manage-races/ui/race-bet-types-form';
import { RaceResultForm, type RaceResultFormRace } from '@/features/admin/manage-races/ui/race-result-form';
import { GuaranteedOddsForm } from '@/features/admin/shared/ui/guaranteed-odds-form';
import { AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { db } from '@/shared/db';
import {
  bet5Events,
  eventDefaultAllowedBetTypes,
  horses,
  raceAllowedBetTypes,
  raceEntries,
  raceOdds,
} from '@/shared/db/schema';
import { Badge, Button, Card, CardContent, CardHeader } from '@/shared/ui';
import { FormattedDate } from '@/shared/ui/formatted-date';
import { getBracketColor } from '@/shared/utils/bracket';
import { cn } from '@/shared/utils/cn';
import { eq } from 'drizzle-orm';
import { Coins, Info, Settings2, Trophy } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'レース詳細編集',
};

// 確定済み結果の着順バッジ色。1〜3着は金銀銅、4着以下は淡色で出す。
// 枠線を持つぶん共通の rank-medal とは別の組で、この画面に閉じて持つ
function resultRankClass(index: number): string {
  if (index === 0) return 'border-amber-200 bg-amber-100 text-amber-700';
  if (index === 1) return 'border-gray-200 bg-gray-100 text-gray-700';
  if (index === 2) return 'border-orange-200 bg-orange-100 text-orange-700';
  return 'text-text-sub border-gray-100 bg-gray-50';
}

type RaceWithRelations = NonNullable<Awaited<ReturnType<typeof getRaceById>>>;

// BET5 の締切案内を出すかの判定に使うイベント情報
interface Bet5CloseTarget {
  status: string;
  race1Id: string;
  race2Id: string;
  race3Id: string;
  race4Id: string;
  race5Id: string;
}

/** 出走前に BET5 の締切を促すかを返す。BET5 の対象レースで、かつ受付中のときだけ促す。 */
function shouldRemindBet5Close(bet5Event: Bet5CloseTarget | undefined, raceId: string): boolean {
  if (bet5Event === undefined) return false;
  const targetRaceIds = [bet5Event.race1Id, bet5Event.race2Id, bet5Event.race3Id, bet5Event.race4Id, bet5Event.race5Id];
  return targetRaceIds.includes(raceId) && bet5Event.status === 'SCHEDULED';
}

/** 払戻を確定できる状態かを返す。払戻結果が既にあるか、受付終了後に着順が入っていれば確定できる。 */
function canFinalizePayoutFor(payoutResultCount: number, status: string, hasFinishPositions: boolean): boolean {
  return payoutResultCount > 0 || (status === 'CLOSED' && hasFinishPositions);
}

/** レースの取得結果を着順設定フォームが求める形へ変換する。会場と締切は未設定でも描けるよう既定値へ倒す。 */
function toResultFormRace(race: RaceWithRelations): RaceResultFormRace {
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

interface FinalizedRaceInfoCardProps {
  race: RaceWithRelations;
  oddsUpdatedAt: Date | undefined;
}

/** 払戻確定後のレース情報カード。オッズの更新時刻は記録がある場合だけ並べる。 */
function FinalizedRaceInfoCard({ race, oddsUpdatedAt }: FinalizedRaceInfoCardProps) {
  return (
    <Card className="border-none">
      <CardHeader className="border-b border-gray-50 pb-4">
        <AdminSectionTitle icon={Settings2}>レース情報</AdminSectionTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6 text-sm">
        <div className="flex items-center justify-between border-b border-gray-50 pb-2">
          <span className="text-text-sub">ステータス</span>
          <Badge variant="status" label={race.status} />
        </div>
        <div className="flex items-center justify-between border-b border-gray-50 pb-2">
          <span className="text-text-sub">コース</span>
          <div className="flex items-center gap-2">
            <Badge variant="surface" label={race.surface} />
            <span className="text-text-main font-semibold">{race.distance}m</span>
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-gray-50 pb-2">
          <span className="text-text-sub">馬場状態</span>
          <Badge variant="condition" label={race.condition} />
        </div>
        <div className="flex items-center justify-between border-b border-gray-50 pb-2">
          <span className="text-text-sub">確定日時</span>
          <span className="text-text-main font-semibold">
            {race.finalizedAt ? (
              <FormattedDate
                date={race.finalizedAt}
                options={{ month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }}
              />
            ) : (
              '-'
            )}
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-gray-50 pb-2">
          <span className="text-text-sub">レース作成方法</span>
          <span className="text-text-main font-semibold">{race.netkeibaUrl ? 'Netkeibaから' : '手動'}</span>
        </div>
        {race.fixedOddsMode && (
          <div className="flex items-center justify-between border-b border-gray-50 pb-2">
            <span className="text-text-sub">オッズ設定</span>
            <span className="font-semibold text-blue-600">固定オッズ</span>
          </div>
        )}
        {oddsUpdatedAt && (
          <div className="flex items-center justify-between pb-2">
            <span className="text-text-sub">オッズ更新</span>
            <span className="text-text-sub text-sm">
              <FormattedDate
                date={oddsUpdatedAt}
                options={{ month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }}
              />
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function RaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [race, payoutResults] = await Promise.all([getRaceById(id), getPayoutResults(id)]);
  if (!race) {
    notFound();
  }
  const [entriesWithResult, oddsRecord] = await Promise.all([
    db
      .select({
        id: raceEntries.id,
        horseNumber: raceEntries.horseNumber,
        bracketNumber: raceEntries.bracketNumber,
        finishPosition: raceEntries.finishPosition,
        jockey: raceEntries.jockey,
        status: raceEntries.status,
        horseName: horses.name,
      })
      .from(raceEntries)
      .innerJoin(horses, eq(raceEntries.horseId, horses.id))
      .where(eq(raceEntries.raceId, id))
      .orderBy(raceEntries.finishPosition, raceEntries.horseNumber),
    db.query.raceOdds.findFirst({
      where: eq(raceOdds.raceId, id),
      columns: { winOdds: true, updatedAt: true },
    }),
  ]);
  const oddsMap = oddsRecord?.winOdds ?? {};

  const [bet5Event, raceTypeRows, eventTypeRows, defaultGuaranteedOdds] = await Promise.all([
    db.query.bet5Events.findFirst({
      where: eq(bet5Events.eventId, race.eventId),
      columns: {
        id: true,
        status: true,
        race1Id: true,
        race2Id: true,
        race3Id: true,
        race4Id: true,
        race5Id: true,
      },
    }),
    db
      .select({ betType: raceAllowedBetTypes.betType })
      .from(raceAllowedBetTypes)
      .where(eq(raceAllowedBetTypes.raceId, id)),
    db
      .select({ betType: eventDefaultAllowedBetTypes.betType })
      .from(eventDefaultAllowedBetTypes)
      .where(eq(eventDefaultAllowedBetTypes.eventId, race.eventId)),
    getDefaultGuaranteedOdds(),
  ]);
  const raceAllowed = toAllowedBetTypes(raceTypeRows.map((r) => r.betType));
  const eventDefault = toAllowedBetTypes(eventTypeRows.map((r) => r.betType));

  const showBet5CloseReminder = shouldRemindBet5Close(bet5Event, race.id);

  const hasFinishPositions = entriesWithResult.some((e) => e.finishPosition !== null);
  const canFinalizePayout = canFinalizePayoutFor(payoutResults.length, race.status, hasFinishPositions);
  // 払戻表ができた後に保証オッズを変えると、計算済みの払戻と食い違うため編集を閉じる
  const isGuaranteedOddsLocked = race.status === 'FINALIZED' || payoutResults.length > 0;

  const settingCards = (
    <>
      {isGuaranteedOddsLocked ? (
        <Card className="border-none">
          <CardHeader className="border-b border-gray-50 pb-4">
            <AdminSectionTitle icon={Coins}>保証オッズ設定</AdminSectionTitle>
          </CardHeader>
          <CardContent className="text-text-sub pt-6 text-sm">着順確定済みのため変更できません</CardContent>
        </Card>
      ) : (
        <GuaranteedOddsForm
          key={JSON.stringify(race.guaranteedOdds)}
          title="保証オッズ設定"
          description="このレースだけ変える券種を 1.1 倍以上で入力します。空欄の券種はデフォルト設定の値を使い、その値を薄く表示しています。"
          initialOdds={race.guaranteedOdds ?? {}}
          placeholders={defaultGuaranteedOdds}
          action={updateGuaranteedOdds.bind(null, race.id)}
          successMessage="保証オッズを更新しました"
        />
      )}
      <RaceBetTypesForm
        key={JSON.stringify(raceAllowed)}
        raceId={race.id}
        initialTypes={raceAllowed}
        eventDefaultTypes={eventDefault}
      />
    </>
  );

  return (
    <div className="space-y-6">
      <div className={race.status === 'FINALIZED' ? 'grid gap-6 lg:grid-cols-3' : ''}>
        <div className={race.status === 'FINALIZED' ? 'lg:col-span-2' : ''}>
          {race.status === 'FINALIZED' && (
            <Card className="border-none">
              <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50 pb-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-control flex h-8 w-8 items-center justify-center bg-amber-50 text-amber-500">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <AdminSectionTitle>確定済み結果</AdminSectionTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {entriesWithResult.map((entry, index) => {
                    const winOdds = oddsMap[String(entry.horseNumber)];
                    return (
                      <div
                        key={entry.id}
                        className="group rounded-surface flex items-center gap-4 border border-gray-100 bg-white p-3 transition hover:border-gray-200"
                      >
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
                              <span className="shrink-0 text-sm font-semibold text-gray-600">
                                オッズ: {winOdds.toFixed(1)}倍
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          {race.status !== 'FINALIZED' &&
            (entriesWithResult.length > 0 ? (
              <RaceResultForm
                raceId={race.id}
                canFinalizePayout={canFinalizePayout}
                showBet5CloseReminder={showBet5CloseReminder}
                entries={entriesWithResult.map((e) => ({
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
            ) : (
              <div className="space-y-6">
                <Card className="border-none">
                  <CardContent className="py-16 text-center">
                    <div className="mb-4 flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                        <Info className="h-8 w-8" />
                      </div>
                    </div>
                    <h3 className="text-text-main mb-2 text-lg font-semibold">出走馬が登録されていません</h3>
                    <p className="text-text-sub text-sm">
                      レース結果を確定するには、まず出走馬を登録する必要があります。
                    </p>
                    <Button asChild variant="outline" className="mt-6 font-semibold">
                      <Link href={`/admin/races/${race.id}/entries`}>出走馬を登録する</Link>
                    </Button>
                  </CardContent>
                </Card>
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-start-3">{settingCards}</div>
                </div>
              </div>
            ))}
        </div>

        {race.status === 'FINALIZED' && (
          <div className="space-y-6">
            <FinalizedRaceInfoCard race={race} oddsUpdatedAt={oddsRecord?.updatedAt} />
            {settingCards}
          </div>
        )}
      </div>
    </div>
  );
}
