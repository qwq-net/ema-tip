import { getDisplayStatus } from '@/entities/race/lib/status';
import { RaceMetaRow } from '@/entities/race/ui/race-meta-row';
import { RaceNumberChip } from '@/entities/race/ui/race-number-chip';
import type { getSokubetDashboardData } from '@/features/betting/queries/sokubet';
import { LoanBanner } from '@/features/economy/loan/ui/loan-banner';
import { RankingButton } from '@/features/ranking/components/ranking-button';
import { Badge, Button, Card, CardTitle, EmptyState, SectionTitle } from '@/shared/ui';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { PageContainer } from '@/shared/ui/layout/page-container';
import { PageHeader } from '@/shared/ui/layout/page-header';
import { formatYen } from '@/shared/utils/format-yen';
import { ChevronLeft, Crown, Wallet, Zap } from 'lucide-react';
import Link from 'next/link';

type EventGroups = Awaited<ReturnType<typeof getSokubetDashboardData>>;

/**
 * 即BET の入口画面。開催中イベントごとに残高と BET5 と融資の案内をまとめ、その下にレースの一覧を並べる。
 * 並び順とプール額の計算は getSokubetDashboardData が済ませたものをそのまま描く。
 * 認可とデータ取得はページ側が持つ。
 */
export function SokubetDashboard({ eventGroups }: { eventGroups: EventGroups }) {
  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'マイページ', href: '/mypage' }, { label: '即BET' }]} />

      <PageHeader title="即BET" description="開催中のレースを選択して、馬券を購入しましょう。" icon={Zap} />

      {eventGroups.length === 0 ? (
        <EmptyState
          title="開催中のイベントはありません"
          description="開催が始まると、ここから投票できます。"
          action={
            <Button asChild variant="outline">
              <Link href="/mypage/claim">お小遣いを貰う</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {eventGroups.map(
            ({
              event,
              races,
              balance,
              totalLoaned,
              bet5Id,
              bet5Status,
              bet5Pot,
              bet5HasClosedRace,
              hasWallet,
              hasPurchasedBet5,
            }) => {
              // BET5イベントが受付中でも、対象レースが締め切られていたら購入不可として扱う
              const bet5Open = bet5Status === 'SCHEDULED' && !bet5HasClosedRace;
              return (
                <section key={event.id}>
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="flex items-center gap-4">
                        <SectionTitle>{event.name}</SectionTitle>
                        <RankingButton eventId={event.id} />
                        {(bet5Id || hasPurchasedBet5) && (
                          <div className="flex items-center gap-2">
                            {bet5Id && (
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/events/${event.id}/bet5`}>
                                  <Crown />
                                  BET5
                                </Link>
                              </Button>
                            )}
                            {hasPurchasedBet5 && <Badge variant="status" label="BET5 購入済み" />}
                          </div>
                        )}
                      </div>
                      <p className="text-text-sub mt-1 text-sm">{event.date}</p>
                    </div>
                    {hasWallet ? (
                      <div className="rounded-surface flex items-center gap-2 bg-gray-50 px-4 py-3 ring-1 ring-gray-200 ring-inset sm:py-2">
                        <Wallet size={16} className="text-text-sub" />
                        <span className="text-text-sub text-sm text-nowrap">購入可能残高</span>
                        <span className="text-text-main flex-1 text-right text-lg font-semibold sm:flex-none">
                          {Math.floor(balance).toLocaleString('ja-JP')}
                          <span className="text-text-sub ml-0.5 text-sm">円</span>
                        </span>
                      </div>
                    ) : (
                      <Button asChild variant="outline" className="shrink-0">
                        <Link href="/mypage/claim">お小遣いを貰う</Link>
                      </Button>
                    )}
                  </div>
                  {bet5Id && bet5Open && (
                    <div className="mb-4">
                      <Link href={`/events/${event.id}/bet5`}>
                        <Card className="bg-turf-950 border-0 p-4 text-white transition-opacity hover:opacity-90">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-turf-100 text-sm">BET5 配当プール</span>
                              <span className="text-gold text-2xl font-semibold tabular-nums">
                                {formatYen(bet5Pot)}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <Badge variant="status" label="受付中" />
                              <ChevronLeft className="rotate-180" />
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </div>
                  )}
                  {hasWallet && (
                    <div className="mb-4">
                      <LoanBanner
                        eventId={event.id}
                        balance={balance}
                        distributeAmount={event.distributeAmount}
                        loanAmount={event.loanAmount ?? event.distributeAmount}
                        hasLoaned={totalLoaned > 0}
                        loanEnabled={event.loanEnabled}
                        loanThresholdPercent={event.loanThresholdPercent}
                      />
                    </div>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    {races.map((race) => (
                      <Link key={race.id} href={`/races/${race.id}`}>
                        <Card className="hover:border-primary p-6 transition">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <span className="text-text-sub text-sm">{race.venue.shortName}</span>
                                {race.raceNumber && <RaceNumberChip raceNumber={race.raceNumber} />}
                                <Badge
                                  variant="status"
                                  label={getDisplayStatus(
                                    race.status,
                                    race.entries.some((e) => e.finishPosition !== null)
                                  )}
                                />
                              </div>
                              <CardTitle as="h3">{race.name}</CardTitle>
                              <RaceMetaRow
                                surface={race.surface}
                                distance={race.distance}
                                entrantCount={race.entries.filter((e) => e.status === 'ENTRANT').length}
                                className="mt-2"
                              />
                            </div>
                            <div className="bg-primary/10 text-primary hover:bg-primary flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:text-white">
                              <ChevronLeft size={20} className="rotate-180" />
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            }
          )}
        </div>
      )}
    </PageContainer>
  );
}
