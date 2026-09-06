import { getAllowedBetTypesForRace } from '@/entities/bet/actions';
import { getDefaultGuaranteedOdds, resolveGuaranteedOdds } from '@/entities/race/lib/guaranteed-odds';
import { RacePageHeader } from '@/entities/race/ui/race-page-header';
import { getEntriesForRace, getRaceById } from '@/features/admin/manage-entries/actions';
import { getRaceOdds } from '@/features/betting/logic/odds';
import { BetTable } from '@/features/betting/ui/bet-table';
import { LoanBanner } from '@/features/economy/loan/ui/loan-banner';
import { getEventWallets, WalletMissingCard } from '@/features/economy/wallet';
import { RankingButton } from '@/features/ranking/components/ranking-button';
import { Button } from '@/shared/ui';
import { requireLoginPage } from '@/shared/utils/admin';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache, Suspense } from 'react';

import { ForecastSection } from './_components/forecast-section';

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
    <div className="flex flex-col items-center p-4 lg:p-8">
      <div className="w-full max-w-5xl space-y-8">
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

        <div className="mb-8 space-y-4">
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
        </div>

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
          eventId={race.eventId}
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

        <Suspense
          fallback={
            <div className="rounded-control flex items-center justify-center border border-gray-200 bg-white p-8">
              <Loader2 className="text-text-sub h-6 w-6 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">予想・見解を読み込み中...</span>
            </div>
          }
        >
          <ForecastSection raceId={id} />
        </Suspense>
      </div>
    </div>
  );
}
