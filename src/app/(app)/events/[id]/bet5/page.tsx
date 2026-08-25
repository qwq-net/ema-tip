import { Bet5VotingForm } from '@/features/betting/ui/bet5-voting-form';
import { LoanBanner } from '@/features/economy/loan/ui/loan-banner';
import { getEventWallets, WalletMissingCard } from '@/features/economy/wallet';
import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { bet5Events, events, raceInstances } from '@/shared/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import { eq, inArray } from 'drizzle-orm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

export default async function Bet5Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/events/${id}/bet5`);
  }

  const [event, bet5Event] = await Promise.all([
    db.query.events.findFirst({
      where: eq(events.id, id),
    }),
    db.query.bet5Events.findFirst({
      where: eq(bet5Events.eventId, id),
    }),
  ]);

  if (!event) notFound();

  if (!bet5Event) {
    return (
      <div className="flex flex-col items-center p-4 lg:p-8">
        <div className="w-full max-w-4xl space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">BET5</h1>
          <p className="text-gray-500">このイベントではBET5は開催されていません。</p>
          <Link
            href="/mypage/sokubet"
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4" />
            即BETトップへ戻る
          </Link>
        </div>
      </div>
    );
  }

  const wallets = await getEventWallets();
  const wallet = wallets.find((w) => w.eventId === id);

  if (!wallet) {
    return (
      <WalletMissingCard
        description="BET5へ投票するには、まずマイページからイベントに参加して資金を受け取ってください。"
        showBackLink
      />
    );
  }

  const targetRaceIds = [bet5Event.race1Id, bet5Event.race2Id, bet5Event.race3Id, bet5Event.race4Id, bet5Event.race5Id];

  const races = await db.query.raceInstances.findMany({
    where: inArray(raceInstances.id, targetRaceIds),
    with: {
      entries: {
        with: {
          horse: true,
        },
        orderBy: (entries, { asc }) => [asc(entries.horseNumber)],
      },
    },
    orderBy: (raceInstances, { asc }) => [asc(raceInstances.raceNumber), asc(raceInstances.name)],
  });

  const orderedRaces = races;

  return (
    <div className="flex flex-col items-center p-4 lg:p-8">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/mypage/sokubet" className="text-sm font-medium text-gray-500 hover:text-gray-900">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">BET5 投票</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>キャリーオーバー: {bet5Event.initialPot.toLocaleString('ja-JP')}円 + α</CardTitle>
          </CardHeader>
          <CardContent>
            <p>5つのレース全ての1着馬を予想してください。1口100円から投票できます。</p>
            <div className="mt-2 text-sm text-gray-500">
              現在のステータス: {bet5Event.status === 'SCHEDULED' ? '受付中' : '受付終了'}
            </div>
          </CardContent>
        </Card>

        <LoanBanner
          eventId={id}
          balance={wallet.balance}
          distributeAmount={event.distributeAmount}
          loanAmount={event.loanAmount ?? event.distributeAmount}
          hasLoaned={wallet.totalLoaned > 0}
        />

        {bet5Event.status === 'SCHEDULED' ? (
          <Bet5VotingForm eventId={id} bet5EventId={bet5Event.id} races={orderedRaces} balance={wallet.balance} />
        ) : (
          <div className="rounded-lg bg-gray-50 p-8 text-center">
            <p className="text-lg font-semibold text-gray-500">投票受付は終了しました</p>
          </div>
        )}
      </div>
    </div>
  );
}
