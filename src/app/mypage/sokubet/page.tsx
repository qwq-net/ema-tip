import { getDisplayStatus } from '@/entities/race/lib/status';
import { getSokubetDashboardData } from '@/features/betting/queries/sokubet';
import { LoanBanner } from '@/features/economy/loan/ui/loan-banner';
import { RankingButton } from '@/features/ranking/components/ranking-button';
import { Badge, Card } from '@/shared/ui';
import { requireLoginPage } from '@/shared/utils/admin';
import { ChevronLeft, Wallet, Zap } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '即BET',
};

export default async function SokubetPage() {
  const session = await requireLoginPage();

  if (!session.user.isOnboardingCompleted) {
    redirect('/onboarding/name-change');
  }

  const sortedEventGroups = await getSokubetDashboardData(session.user.id);

  return (
    <div className="flex flex-col items-center p-4 lg:p-8">
      <div className="w-full max-w-5xl space-y-8">
        <div className="flex items-center gap-4">
          <Link
            href="/mypage"
            className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft size={16} />
            マイページへ戻る
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600">
            <Zap size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">即BET</h1>
            <p className="text-gray-500">開催中のレースを選択して、馬券を購入しましょう。</p>
          </div>
        </div>

        {sortedEventGroups.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">現在、開催中のイベントはありません。</Card>
        ) : (
          <div className="space-y-8">
            {sortedEventGroups.map(
              ({ event, races, balance, totalLoaned, bet5Id, bet5Status, hasWallet, hasPurchasedBet5 }) => (
                <section key={event.id}>
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="flex items-center gap-4">
                        <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">{event.name}</h2>
                        <RankingButton eventId={event.id} />
                        {(bet5Id || hasPurchasedBet5) && (
                          <div className="flex items-center gap-2">
                            {bet5Id && (
                              <Link href={`/events/${event.id}/bet5`}>
                                <Badge
                                  label={bet5Status === 'SCHEDULED' ? 'BET5 開催中' : 'BET5 締切済み'}
                                  className={
                                    bet5Status === 'SCHEDULED'
                                      ? 'cursor-pointer border-0 bg-green-500 text-white hover:bg-green-600'
                                      : 'cursor-pointer border-0 bg-gray-500 text-white hover:bg-gray-600'
                                  }
                                />
                              </Link>
                            )}
                            {hasPurchasedBet5 && (
                              <Badge label="BET5 購入済み" className="border-0 bg-indigo-500 text-white" />
                            )}
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-gray-400">{event.date}</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200 ring-inset sm:py-2">
                      <Wallet size={16} className="text-gray-400" />
                      <span className="text-sm font-semibold text-nowrap text-gray-500">投票可能残高</span>
                      <span className="flex-1 text-right text-lg font-semibold text-gray-900 sm:flex-none">
                        {Math.floor(balance).toLocaleString('ja-JP')}
                        <span className="ml-0.5 text-sm font-semibold text-gray-400">円</span>
                      </span>
                    </div>
                  </div>
                  {bet5Id && bet5Status === 'SCHEDULED' && (
                    <div className="mb-4">
                      <Link href={`/events/${event.id}/bet5`}>
                        <Card className="cursor-pointer border-0 bg-linear-to-r from-indigo-500 to-purple-600 p-4 text-white shadow-md transition-opacity hover:opacity-90">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="flex items-center gap-2 text-lg font-semibold">
                                <span className="rounded bg-white px-2 py-0.5 text-sm text-indigo-600">BET5</span>
                                5レース的中・一攫千金チャンス！
                              </h3>
                              <p className="mt-1 text-sm text-indigo-100">対象の5レース全ての1着を予想しよう</p>
                            </div>
                            <ChevronLeft className="rotate-180" />
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
                      />
                    </div>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    {races.map((race) => (
                      <Link key={race.id} href={`/races/${race.id}`}>
                        <Card className="hover:border-primary p-6 transition-all hover:shadow-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-500">{race.venue?.shortName}</span>
                                {race.raceNumber && (
                                  <span className="flex h-5 w-7 items-center justify-center rounded bg-gray-100 text-sm font-semibold text-gray-600">
                                    {race.raceNumber}R
                                  </span>
                                )}
                                <Badge
                                  variant="status"
                                  label={getDisplayStatus(
                                    race.status,
                                    race.entries?.some((e) => e.finishPosition !== null) ?? false
                                  )}
                                />
                              </div>
                              <h3 className="text-xl font-semibold text-gray-900">{race.name}</h3>
                              <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                                <span>{race.surface}</span>
                                <span className="h-1 w-1 rounded-full bg-gray-300" />
                                <span>{race.distance}m</span>
                                <span className="h-1 w-1 rounded-full bg-gray-300" />
                                <span>{race.entries?.length || 0}頭</span>
                              </div>
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
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
