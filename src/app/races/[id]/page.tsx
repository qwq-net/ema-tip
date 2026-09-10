import { getAllowedBetTypesForRace } from '@/entities/bet/actions';
import { getDefaultGuaranteedOdds, resolveGuaranteedOdds } from '@/entities/race/lib/guaranteed-odds';
import { RacePageHeader } from '@/entities/race/ui/race-page-header';
import { getEntriesForRace, getRaceById } from '@/features/admin/manage-entries/actions';
import { getRaceOdds } from '@/features/betting/logic/odds';
import { BetTable } from '@/features/betting/ui/bet-table';
import { LoanBanner } from '@/features/economy/loan/ui/loan-banner';
import { getEventWallets, WalletMissingCard } from '@/features/economy/wallet';
import { getForecastsByRaceId } from '@/features/forecasts/actions';
import { ForecastDisplay } from '@/features/forecasts/components/ForecastDisplay';
import { RankingButton } from '@/features/ranking/components/ranking-button';
import { Button, EmptyState } from '@/shared/ui';
import { PageContainer } from '@/shared/ui/layout/page-container';
import { requireLoginPage } from '@/shared/utils/admin';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache, type ComponentProps, Suspense } from 'react';

import { formatRaceLabel } from '@/entities/race/lib/label';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import type { Metadata } from 'next';

// generateMetadata と page 本体で同じレースを引くため、リクエスト内で重複クエリを排除する
const getRaceCached = cache(getRaceById);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const race = await getRaceCached(id);

  if (!race) {
    return {
      title: 'レースが見つかりません',
    };
  }

  const raceNumberLabel = race.raceNumber ? `${race.raceNumber}R` : '';

  return {
    title: race.name,
    description: `${race.venue.shortName} ${raceNumberLabel} ${race.name}の予想・オッズ情報`,
  };
}

type RaceWithRelations = NonNullable<Awaited<ReturnType<typeof getRaceById>>>;

// 融資バナーへ渡す金額と表示条件
interface LoanBannerValues {
  distributeAmount: number;
  loanAmount: number;
  loanEnabled: boolean;
  loanThresholdPercent: number;
}

/**
 * イベント設定から融資バナーの表示値を組む。
 * 借入金額が未設定なら配布金額を代わりに使う。
 */
function toLoanBannerValues(event: RaceWithRelations['event']): LoanBannerValues {
  return {
    distributeAmount: event.distributeAmount,
    loanAmount: event.loanAmount ?? event.distributeAmount,
    loanEnabled: event.loanEnabled,
    loanThresholdPercent: event.loanThresholdPercent,
  };
}

/**
 * 予想・見解の一覧。ページ本体の表示を待たせないため Suspense の内側で解決させる。
 * 出馬表はページ側で取得済みのものを渡し、同じ問い合わせを二度実行しない。
 */
async function ForecastPanel({
  raceId,
  entries,
}: {
  raceId: string;
  entries: ComponentProps<typeof ForecastDisplay>['entries'];
}) {
  const forecasts = await getForecastsByRaceId(raceId);
  return <ForecastDisplay forecasts={forecasts} entries={entries} />;
}

export default async function RacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireLoginPage();

  const [race, entries, wallets, initialOdds, defaultGuaranteedOdds] = await Promise.all([
    getRaceCached(id),
    getEntriesForRace(id),
    getEventWallets(),
    getRaceOdds(id),
    getDefaultGuaranteedOdds(),
  ]);

  if (!race) {
    notFound();
  }

  const allowedBetTypes = await getAllowedBetTypesForRace(race.id, race.eventId);

  const wallet = wallets.find((w) => w.eventId === race.eventId);

  if (!wallet) {
    return <WalletMissingCard showBackLink={true} />;
  }

  const loanValues = toLoanBannerValues(race.event);

  return (
    <PageContainer>
      <Breadcrumbs
        items={[
          { label: 'マイページ', href: '/mypage' },
          { label: '即BET', href: '/mypage/sokubet' },
          {
            label: formatRaceLabel({
              venueShortName: race.venue.shortName,
              raceNumber: race.raceNumber,
              name: race.name,
            }),
          },
        ]}
      />

      <RacePageHeader
        venueShortName={race.venue.shortName}
        raceNumber={race.raceNumber}
        eventName={race.event.name}
        name={race.name}
        netkeibaUrl={race.netkeibaUrl}
        surface={race.surface}
        distance={race.distance}
        entrantCount={entries.filter((e) => e.status === 'ENTRANT').length}
        actions={
          <>
            <RankingButton eventId={race.eventId} size="md" />
            <Button variant="outline" asChild>
              <Link href={`/races/${id}/standby`}>購入馬券確認・結果待機</Link>
            </Button>
          </>
        }
      />

      <LoanBanner
        eventId={race.eventId}
        balance={wallet.balance}
        distributeAmount={loanValues.distributeAmount}
        loanAmount={loanValues.loanAmount}
        hasLoaned={wallet.totalLoaned > 0}
        loanEnabled={loanValues.loanEnabled}
        loanThresholdPercent={loanValues.loanThresholdPercent}
      />

      <BetTable
        raceId={race.id}
        walletId={wallet.id}
        balance={wallet.balance}
        entries={entries}
        initialStatus={race.status}
        closingAt={race.closingAt ? race.closingAt.toISOString() : null}
        initialOdds={initialOdds}
        fixedOddsMode={race.fixedOddsMode}
        guaranteedOdds={resolveGuaranteedOdds(defaultGuaranteedOdds, race.guaranteedOdds)}
        allowedBetTypes={allowedBetTypes}
      />

      <Suspense fallback={<EmptyState icon={Loader2} title="予想・見解を読み込み中..." />}>
        <ForecastPanel raceId={id} entries={entries} />
      </Suspense>
    </PageContainer>
  );
}
