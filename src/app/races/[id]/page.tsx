import { RacePageHeader } from '@/entities/race/ui/race-page-header';
import { getEntriesForRace, getRaceById } from '@/features/admin/manage-entries/actions';
import { getRaceOdds } from '@/features/betting/logic/odds';
import { BetTable } from '@/features/betting/ui/bet-table';
import { LoanBanner } from '@/features/economy/loan/ui/loan-banner';
import { getEventWallets, WalletMissingCard } from '@/features/economy/wallet';
import { RankingButton } from '@/features/ranking/components/ranking-button';
import { Button } from '@/shared/ui';
import { requireLoginPage } from '@/shared/utils/admin';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache, Suspense } from 'react';

import { ForecastSection } from './_components/forecast-section';

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

  return {
    title: race.name,
    description: `${race.venue?.shortName} ${race.raceNumber ? race.raceNumber + 'R' : ''} ${race.name}の予想・オッズ情報`,
  };
}

export default async function RacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireLoginPage();

  const [race, entries, wallets, initialOdds] = await Promise.all([
    getRaceCached(id),
    getEntriesForRace(id),
    getEventWallets(),
    getRaceOdds(id),
  ]);

  if (!race) {
    notFound();
  }

  const wallet = wallets.find((w) => w.eventId === race.eventId);

  if (!wallet) {
    return <WalletMissingCard showBackLink={true} />;
  }

  return (
    <div className="flex flex-col items-center p-4 lg:p-8">
      <div className="w-full max-w-5xl space-y-8">
        <Link
          href="/mypage/sokubet"
          className="mb-6 flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ChevronLeft size={16} />
          即BETトップへ戻る
        </Link>

        <div className="mb-8 space-y-4">
          <RacePageHeader
            venueShortName={race.venue?.shortName}
            raceNumber={race.raceNumber}
            eventName={race.event?.name}
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
          distributeAmount={race.event?.distributeAmount ?? 0}
          loanAmount={race.event?.loanAmount ?? race.event?.distributeAmount ?? 0}
          hasLoaned={wallet.totalLoaned > 0}
          loanEnabled={race.event?.loanEnabled ?? false}
          loanThresholdPercent={race.event?.loanThresholdPercent ?? 30}
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
          guaranteedOdds={race.guaranteedOdds}
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
