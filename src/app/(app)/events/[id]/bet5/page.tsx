import { Bet5MyTicketsDialog } from '@/features/betting/ui/bet5-my-tickets-dialog';
import { Bet5RaceList } from '@/features/betting/ui/bet5-race-list';
import { Bet5VotingForm } from '@/features/betting/ui/bet5-voting-form';
import { LoanBanner } from '@/features/economy/loan/ui/loan-banner';
import { getEventWallets, WalletMissingCard } from '@/features/economy/wallet';
import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { bet5Events, bet5Tickets, events, raceInstances } from '@/shared/db/schema';
import { Alert, Badge, Card } from '@/shared/ui';
import { type BreadcrumbItem, Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { PageContainer } from '@/shared/ui/layout/page-container';
import { firstRow } from '@/shared/utils/first-row';
import { formatYen } from '@/shared/utils/format-yen';
import { and, desc, eq, inArray, sum } from 'drizzle-orm';
import { AlertCircle } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';

// 表側にイベントのページはないため、イベント名はリンクを持たない階層として置く
function bet5Breadcrumbs(eventName: string): BreadcrumbItem[] {
  return [
    { label: 'マイページ', href: '/mypage' },
    { label: '即BET', href: '/mypage/sokubet' },
    { label: eventName },
    { label: 'BET5' },
  ];
}

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
      <PageContainer>
        <Breadcrumbs items={bet5Breadcrumbs(event.name)} />
        <h1 className="text-text-main text-3xl font-semibold">BET5</h1>
        <p className="text-text-sub">このイベントではBET5は開催されていません。</p>
      </PageContainer>
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

  const [races, myTickets, salesRows] = await Promise.all([
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
    db
      .select({ total: sum(bet5Tickets.amount) })
      .from(bet5Tickets)
      .where(eq(bet5Tickets.bet5EventId, bet5Event.id)),
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

  // 払戻完了後はキャリーオーバーが精算で消費・繰越済みのため、初期プールだけを出す
  const carryoverAmount = bet5Event.status === 'FINALIZED' ? 0 : event.carryoverAmount;
  // 表示する配当プールは払戻計算の calculateBet5Payout と同じ式で揃える
  const totalSales = Number(firstRow(salesRows, 'BET5の売上').total ?? 0);
  const pot = bet5Event.initialPot + totalSales + carryoverAmount;

  return (
    <PageContainer>
      <Breadcrumbs items={bet5Breadcrumbs(event.name)} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-text-main text-3xl font-semibold">BET5 投票</h1>
          <Badge variant="status" label={isOpen ? '受付中' : '受付終了'} />
        </div>
        <Bet5MyTicketsDialog tickets={myTickets} races={orderedRaces} />
      </div>

      <Card className="bg-turf-950 border-0 p-5 text-white">
        <p className="text-turf-100 text-sm">配当プール</p>
        <p className="text-gold text-4xl font-semibold tabular-nums">{formatYen(pot)}</p>
      </Card>

      <LoanBanner
        eventId={id}
        balance={wallet.balance}
        distributeAmount={event.distributeAmount}
        loanAmount={event.loanAmount ?? event.distributeAmount}
        hasLoaned={wallet.totalLoaned > 0}
        loanEnabled={event.loanEnabled}
        loanThresholdPercent={event.loanThresholdPercent}
      />

      {isOpen ? (
        <Bet5VotingForm eventId={id} bet5EventId={bet5Event.id} races={orderedRaces} balance={wallet.balance} />
      ) : (
        <div className="space-y-4">
          {hasClosedRace && bet5Event.status === 'SCHEDULED' && (
            <Alert variant="error" icon={AlertCircle}>
              対象レースが既に締め切られているため、BET5の投票受付は終了しました。
            </Alert>
          )}
          <Bet5RaceList races={orderedRaces} readOnly />
        </div>
      )}
    </PageContainer>
  );
}
