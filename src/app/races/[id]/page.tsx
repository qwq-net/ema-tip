import { getEntriesForRace, getRaceById } from '@/features/admin/manage-entries/actions';
import { getRaceOdds } from '@/features/betting/logic/odds';
import { BetTable } from '@/features/betting/ui/bet-table';
import { LoanBanner } from '@/features/economy/loan/ui/loan-banner';
import { getEventWallets, WalletMissingCard } from '@/features/economy/wallet';
import { RankingButton } from '@/features/ranking/components/ranking-button';
import { Button } from '@/shared/ui';
import { requireLoginPage } from '@/shared/utils/admin';
import { ChevronLeft, ExternalLink, Loader2 } from 'lucide-react';
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
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-500">{race.venue?.shortName}</span>
              {race.raceNumber && (
                <span className="flex h-5 w-7 items-center justify-center rounded bg-gray-100 text-sm font-semibold text-gray-600">
                  {race.raceNumber}R
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-semibold text-gray-900">{race.name}</h1>
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
              <div className="flex items-center gap-2">
                <RankingButton eventId={race.eventId} size="md" />
                <Button variant="outline" asChild>
                  <Link href={`/races/${id}/standby`}>購入馬券確認・結果待機</Link>
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{race.surface}</span>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span>{race.distance}m</span>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span>{entries.filter((e) => e.status === 'ENTRANT').length}頭</span>
            </div>
          </div>
        </div>

        <LoanBanner
          eventId={race.eventId}
          balance={wallet.balance}
          distributeAmount={race.event?.distributeAmount ?? 0}
          loanAmount={race.event?.loanAmount ?? race.event?.distributeAmount ?? 0}
          hasLoaned={wallet.totalLoaned > 0}
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
        />

        <Suspense
          fallback={
            <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
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
