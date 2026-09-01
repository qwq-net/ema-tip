import { getPayoutResults } from '@/entities/race/actions';
import { UpdateNetkeibaOddsButton } from '@/features/admin/import-race/ui/update-odds-button';
import { getRaceById } from '@/features/admin/manage-entries/actions';
import { RaceResultForm } from '@/features/admin/manage-races/ui/race-result-form';
import { AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { RACE_CONDITIONS, RACE_SURFACES } from '@/shared/constants/race';
import { db } from '@/shared/db';
import { bet5Events, horses, raceEntries, raceOdds } from '@/shared/db/schema';
import { Badge, Button, Card, CardContent, CardHeader } from '@/shared/ui';
import { FormattedDate } from '@/shared/ui/formatted-date';
import { getBracketColor } from '@/shared/utils/bracket';
import { cn } from '@/shared/utils/cn';
import { narrowToOption } from '@/shared/utils/lookup';
import { eq } from 'drizzle-orm';
import { ChevronLeft, ExternalLink, Info, Settings2, Trophy } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'レース詳細編集',
};

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

  const bet5Event = await db.query.bet5Events.findFirst({
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
  });

  const isBet5TargetRace =
    bet5Event !== undefined &&
    [bet5Event.race1Id, bet5Event.race2Id, bet5Event.race3Id, bet5Event.race4Id, bet5Event.race5Id].includes(race.id);
  const showBet5CloseReminder = isBet5TargetRace && bet5Event?.status === 'SCHEDULED';

  const hasFinishPositions = entriesWithResult.some((e) => e.finishPosition !== null);
  const canFinalizePayout = payoutResults.length > 0 || (race.status === 'CLOSED' && hasFinishPositions);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/races"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex flex-1 items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-gray-200 bg-gray-100 px-2 text-sm font-semibold text-gray-700">
                {race.raceNumber ? `${race.raceNumber}R` : '-'}
              </span>
              <h1 className="text-2xl font-semibold text-gray-900">{race.name}</h1>
              {race.netkeibaUrl && (
                <a
                  href={race.netkeibaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-sm font-medium text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100"
                >
                  <ExternalLink className="h-3 w-3" />
                  Netkeiba
                </a>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <p>
                {race.date.replace(/-/g, '/')} @ {race.venue?.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {race.netkeibaUrl && (
              <UpdateNetkeibaOddsButton
                raceId={id}
                className="border-blue-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50"
              />
            )}
            <Button variant="outline" asChild>
              <Link href={`/admin/races/${race.id}/odds`}>
                <Trophy className="mr-2 h-4 w-4" />
                保証オッズ設定
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/races/${race.id}/edit`}>
                <Settings2 className="mr-2 h-4 w-4" />
                レース情報を編集
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className={race.status === 'FINALIZED' ? 'grid gap-6 lg:grid-cols-3' : ''}>
        <div className={race.status === 'FINALIZED' ? 'lg:col-span-2' : ''}>
          {race.status === 'FINALIZED' ? (
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50 pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <AdminSectionTitle>確定済み結果</AdminSectionTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {entriesWithResult.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-3 transition-all hover:border-gray-200 hover:shadow-sm"
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xl font-semibold transition-colors',
                          index === 0
                            ? 'border-amber-200 bg-amber-100 text-amber-700'
                            : index === 1
                              ? 'border-slate-200 bg-slate-100 text-slate-700'
                              : index === 2
                                ? 'border-orange-200 bg-orange-100 text-orange-700'
                                : 'border-gray-100 bg-gray-50 text-gray-400'
                        )}
                      >
                        {index + 1}
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded text-sm font-semibold ring-1 ring-black/5',
                            getBracketColor(entry.bracketNumber)
                          )}
                        >
                          {entry.bracketNumber || '?'}
                        </span>
                        <span className="text-primary bg-primary/10 ring-primary/10 flex h-7 w-7 items-center justify-center rounded text-sm font-semibold ring-1">
                          {entry.horseNumber || '?'}
                        </span>
                      </div>

                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span className="truncate text-base font-semibold text-gray-900">{entry.horseName}</span>
                        {entry.jockey && (
                          <>
                            <span className="shrink-0 text-sm text-gray-400">/</span>
                            <span className="shrink-0 text-sm text-gray-500">{entry.jockey}</span>
                          </>
                        )}
                        {oddsMap[String(entry.horseNumber)] != null && (
                          <>
                            <span className="shrink-0 text-sm text-gray-400">/</span>
                            <span className="shrink-0 text-sm font-semibold text-gray-600">
                              オッズ: {oddsMap[String(entry.horseNumber)].toFixed(1)}倍
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : entriesWithResult.length > 0 ? (
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
              race={{
                id: race.id,
                eventId: race.eventId,
                date: race.date,
                location: race.venue?.name || '',
                name: race.name,
                raceNumber: race.raceNumber,
                status: race.status,
                surface: narrowToOption(RACE_SURFACES, race.surface) ?? '芝',
                distance: race.distance,
                condition: narrowToOption(RACE_CONDITIONS, race.condition),
                closingAt: race.closingAt ? race.closingAt.toISOString() : null,
                netkeibaUrl: race.netkeibaUrl ?? null,
                fixedOddsMode: race.fixedOddsMode,
              }}
            />
          ) : (
            <Card className="border-none shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                    <Info className="h-8 w-8" />
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">出走馬が登録されていません</h3>
                <p className="text-sm text-gray-500">レース結果を確定するには、まず出走馬を登録する必要があります。</p>
                <Link href={`/admin/entries/${race.id}`} className="mt-6 inline-block">
                  <Button variant="outline" className="font-semibold">
                    出走馬を登録する
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {race.status === 'FINALIZED' && (
          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b border-gray-50 pb-4">
                <AdminSectionTitle icon={Settings2}>レース情報</AdminSectionTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 text-sm">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="font-medium text-gray-500">ステータス</span>
                  <Badge variant="status" label={race.status} />
                </div>
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="font-medium text-gray-500">コース</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="surface" label={race.surface} />
                    <span className="font-semibold text-gray-900">{race.distance}m</span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="font-medium text-gray-500">馬場状態</span>
                  <Badge variant="condition" label={race.condition} />
                </div>
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="font-medium text-gray-500">確定日時</span>
                  <span className="font-semibold text-gray-900">
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
                  <span className="font-medium text-gray-500">レース作成方法</span>
                  <span className="font-semibold text-gray-900">{race.netkeibaUrl ? 'Netkeibaから' : '手動'}</span>
                </div>
                {race.fixedOddsMode && (
                  <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                    <span className="font-medium text-gray-500">オッズ設定</span>
                    <span className="font-semibold text-blue-600">固定オッズ</span>
                  </div>
                )}
                {oddsRecord && (
                  <div className="flex items-center justify-between pb-2">
                    <span className="font-medium text-gray-500">オッズ更新</span>
                    <span className="text-sm text-gray-400">
                      <FormattedDate
                        date={oddsRecord.updatedAt}
                        options={{ month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }}
                      />
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
