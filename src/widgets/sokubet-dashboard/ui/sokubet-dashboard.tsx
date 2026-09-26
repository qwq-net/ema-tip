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
type EventGroup = EventGroups[number];

/** イベント名、ランキング、BET5、参加者の残高を並べる。開催済みのイベントには参加導線を出さない。 */
function EventHeader({ group }: { group: EventGroup }) {
  const { event, balance, bet5Id, hasWallet, hasPurchasedBet5 } = group;
  const isActive = event.status === 'ACTIVE';
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-4">
          <SectionTitle as="h3">{event.name}</SectionTitle>
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
      {hasWallet && (
        <div className="rounded-surface flex items-center gap-2 bg-gray-50 px-4 py-3 ring-1 ring-gray-200 ring-inset sm:py-2">
          <Wallet size={16} className="text-text-sub" />
          <span className="text-text-sub text-sm text-nowrap">{isActive ? '購入可能残高' : '最終残高'}</span>
          <span className="text-text-main flex-1 text-right text-lg font-semibold sm:flex-none">
            {Math.floor(balance).toLocaleString('ja-JP')}
            <span className="text-text-sub ml-0.5 text-sm">円</span>
          </span>
        </div>
      )}
      {!hasWallet && isActive && (
        <Button asChild variant="outline" className="shrink-0">
          <Link href="/mypage/claim">お小遣いを貰う</Link>
        </Button>
      )}
    </div>
  );
}

/** レースの閲覧に必要な情報をイベントごとに表示する。購入と融資の案内は開催中だけに限る。 */
function EventCard({ group }: { group: EventGroup }) {
  const { event, races, balance, totalLoaned, bet5Id, bet5Status, bet5Pot, bet5HasClosedRace, hasWallet } = group;
  const isActive = event.status === 'ACTIVE';
  const bet5Open = isActive && bet5Status === 'SCHEDULED' && !bet5HasClosedRace;
  return (
    <section className="space-y-4">
      <EventHeader group={group} />
      {bet5Id && bet5Open && (
        <Link href={`/events/${event.id}/bet5`}>
          <Card className="bg-turf-950 border-0 p-4 text-white transition-opacity hover:opacity-90">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-turf-100 text-sm">BET5 配当プール</span>
                <span className="text-gold text-2xl font-semibold tabular-nums">{formatYen(bet5Pot)}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge variant="status" label="受付中" />
                <ChevronLeft className="rotate-180" />
              </div>
            </div>
          </Card>
        </Link>
      )}
      {isActive && hasWallet && (
        <LoanBanner
          eventId={event.id}
          balance={balance}
          distributeAmount={event.distributeAmount}
          loanAmount={event.loanAmount ?? event.distributeAmount}
          hasLoaned={totalLoaned > 0}
          loanEnabled={event.loanEnabled}
          loanThresholdPercent={event.loanThresholdPercent}
        />
      )}
      {races.length === 0 && <p className="text-text-sub text-sm">レースはありません。</p>}
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
                        race.entries.some((entry) => entry.finishPosition !== null)
                      )}
                    />
                  </div>
                  <CardTitle as="h4">{race.name}</CardTitle>
                  <RaceMetaRow
                    surface={race.surface}
                    distance={race.distance}
                    entrantCount={race.entries.filter((entry) => entry.status === 'ENTRANT').length}
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

/** 開催中と開催済みのイベントを分けて表示する。認可とデータ取得はページ側が持つ。 */
export function SokubetDashboard({ eventGroups }: { eventGroups: EventGroups }) {
  const active = eventGroups.filter((group) => group.event.status === 'ACTIVE');
  const completed = eventGroups.filter((group) => group.event.status === 'COMPLETED');
  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'マイページ', href: '/mypage' }, { label: '即BET' }]} />
      <PageHeader title="即BET" description="開催中のレースを選択して、馬券を購入しましょう。" icon={Zap} />
      {eventGroups.length === 0 ? (
        <EmptyState
          title="イベントはありません"
          description="開催が始まると、ここから投票できます。"
          action={
            <Button asChild variant="outline">
              <Link href="/mypage/claim">お小遣いを貰う</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <div className="space-y-4">
              <SectionTitle>開催中</SectionTitle>
              {active.map((group) => (
                <EventCard key={group.event.id} group={group} />
              ))}
            </div>
          )}
          {completed.length > 0 && (
            <div className="space-y-4">
              <SectionTitle>開催済み</SectionTitle>
              {completed.map((group) => (
                <EventCard key={group.event.id} group={group} />
              ))}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
