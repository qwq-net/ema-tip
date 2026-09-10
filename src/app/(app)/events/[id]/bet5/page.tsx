import { getEventWallets, WalletMissingCard } from '@/features/economy/wallet';
import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { bet5Events, bet5Tickets, events, raceInstances } from '@/shared/db/schema';
import { EmptyState } from '@/shared/ui';
import { type BreadcrumbItem, Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { PageContainer } from '@/shared/ui/layout/page-container';
import { PageHeader } from '@/shared/ui/layout/page-header';
import { firstRow } from '@/shared/utils/first-row';
import { Bet5Voting } from '@/widgets/bet5-voting/ui/bet5-voting';
import { and, desc, eq, inArray, sum } from 'drizzle-orm';
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
        <PageHeader title="BET5" />
        <EmptyState title="このイベントではBET5は開催されていません。" />
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
    <Bet5Voting
      breadcrumbs={bet5Breadcrumbs(event.name)}
      eventId={id}
      bet5EventId={bet5Event.id}
      isOpen={isOpen}
      closedByRace={hasClosedRace && bet5Event.status === 'SCHEDULED'}
      pot={pot}
      balance={wallet.balance}
      loan={{
        distributeAmount: event.distributeAmount,
        loanAmount: event.loanAmount ?? event.distributeAmount,
        hasLoaned: wallet.totalLoaned > 0,
        loanEnabled: event.loanEnabled,
        loanThresholdPercent: event.loanThresholdPercent,
      }}
      races={orderedRaces}
      tickets={myTickets}
    />
  );
}
