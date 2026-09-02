import { Bet5MyTicketsDialog } from '@/features/betting/ui/bet5-my-tickets-dialog';
import { Bet5VotingForm } from '@/features/betting/ui/bet5-voting-form';
import { LoanBanner } from '@/features/economy/loan/ui/loan-banner';
import { getEventWallets, WalletMissingCard } from '@/features/economy/wallet';
import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { bet5Events, bet5Tickets, events, raceInstances } from '@/shared/db/schema';
import { Card } from '@/shared/ui';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { AlertCircle, ChevronLeft } from 'lucide-react';
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

  const [races, myTickets] = await Promise.all([
    db.query.raceInstances.findMany({
      where: inArray(raceInstances.id, targetRaceIds),
      with: {
        entries: {
          with: {
            horse: true,
          },
          orderBy: (entries, { asc }) => [asc(entries.horseNumber)],
        },
      },
    }),
    db.query.bet5Tickets.findMany({
      where: and(eq(bet5Tickets.bet5EventId, bet5Event.id), eq(bet5Tickets.userId, session.user.id)),
      orderBy: [desc(bet5Tickets.createdAt)],
    }),
  ]);

  // 表示順・選択スロット・的中判定はすべて bet5Event の race1..race5 の定義順で揃える。
  // raceNumber 順に並べると同番号レース混在時に選択が別レースのスロットへ保存されてしまう
  const racesById = new Map(races.map((race) => [race.id, race]));
  const orderedRaces = targetRaceIds
    .map((raceId) => racesById.get(raceId))
    .filter((race): race is NonNullable<typeof race> => race !== undefined);

  // 対象レースが1つでも締め切られていたら、BET5イベント自体が受付中でも購入不可。
  // サーバー側でも placeBet5Bet が同条件で拒否する
  const hasClosedRace = orderedRaces.some((race) => race.status !== 'SCHEDULED');
  const isOpen = bet5Event.status === 'SCHEDULED' && !hasClosedRace;

  return (
    <div className="flex flex-col items-center p-4 lg:p-8">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/mypage/sokubet"
            className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4" />
            即BETへ戻る
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">BET5 投票</h1>
        </div>

        <Card className="bg-turf-950 border-0 p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-gold text-turf-950 rounded-chip px-2 py-0.5 text-sm font-semibold">BET5</span>
              <h2 className="text-lg font-semibold">5レース的中・一攫千金チャンス！</h2>
            </div>
            {isOpen ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                </span>
                受付中
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white/80">
                受付終了
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-turf-100 text-sm">BET5プール金額</p>
            <p className="text-gold text-3xl font-semibold tabular-nums">
              {bet5Event.initialPot.toLocaleString('ja-JP')}円
              <span className="text-turf-100 ml-1.5 text-base font-medium">+ プレイヤーの購入金額</span>
            </p>
          </div>
          <p className="text-turf-100 mt-3 text-sm">
            5つのレース全ての1着馬を予想してください。1口100円から投票できます。
          </p>
        </Card>

        <Bet5MyTicketsDialog tickets={myTickets} races={orderedRaces} />

        <LoanBanner
          eventId={id}
          balance={wallet.balance}
          distributeAmount={event.distributeAmount}
          loanAmount={event.loanAmount ?? event.distributeAmount}
          hasLoaned={wallet.totalLoaned > 0}
        />

        {isOpen ? (
          <Bet5VotingForm eventId={id} bet5EventId={bet5Event.id} races={orderedRaces} balance={wallet.balance} />
        ) : (
          <div className="space-y-4">
            {hasClosedRace && bet5Event.status === 'SCHEDULED' && (
              <div className="rounded-control flex items-center gap-2 bg-red-50 p-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
                <AlertCircle className="h-4 w-4 shrink-0" />
                対象レースが既に締め切られているため、BET5の投票受付は終了しました。
              </div>
            )}
            <div className="rounded-control bg-gray-50 p-8 text-center">
              <p className="text-lg font-semibold text-gray-500">投票受付は終了しました</p>
              <p className="text-text-sub mt-2 text-sm">
                対象レース: {orderedRaces.map((race) => `${race.raceNumber}R`).join(' ▶ ')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
