import { db } from '@/shared/db';
import { bet5Events, bet5Tickets, events, raceInstances, wallets } from '@/shared/db/schema';
import { and, desc, eq, inArray, sum } from 'drizzle-orm';

export async function getSokubetDashboardData(userId: string) {
  const [listedEvents, userWallets] = await Promise.all([
    db.query.events.findMany({
      where: inArray(events.status, ['ACTIVE', 'COMPLETED']),
      orderBy: [desc(events.date), desc(events.createdAt)],
    }),
    db.query.wallets.findMany({
      where: eq(wallets.userId, userId),
    }),
  ]);

  if (listedEvents.length === 0) {
    return [];
  }

  const listedEventIds = listedEvents.map((event) => event.id);
  const [listedRaces, bet5EventsList, bet5SalesRows] = await Promise.all([
    db.query.raceInstances.findMany({
      where: inArray(raceInstances.eventId, listedEventIds),
      orderBy: [desc(raceInstances.date)],
      with: {
        event: true,
        venue: true,
        // UI は出走中の頭数と着順入力済みかしか使わないため、entries はそのカラムだけ返す
        entries: { columns: { finishPosition: true, status: true } },
      },
    }),
    db.query.bet5Events.findMany({
      where: inArray(bet5Events.eventId, listedEventIds),
      columns: {
        id: true,
        eventId: true,
        status: true,
        initialPot: true,
        race1Id: true,
        race2Id: true,
        race3Id: true,
        race4Id: true,
        race5Id: true,
      },
    }),
    // 配当プールの表示に使う BET5 の売上。bet5Events を跨いで一度に集計する
    db
      .select({ bet5EventId: bet5Tickets.bet5EventId, total: sum(bet5Tickets.amount) })
      .from(bet5Tickets)
      .innerJoin(bet5Events, eq(bet5Tickets.bet5EventId, bet5Events.id))
      .where(inArray(bet5Events.eventId, listedEventIds))
      .groupBy(bet5Tickets.bet5EventId),
  ]);

  const listedBet5EventIds = bet5EventsList.map((event) => event.id);
  const userBet5Tickets =
    listedBet5EventIds.length > 0
      ? await db.query.bet5Tickets.findMany({
          where: and(eq(bet5Tickets.userId, userId), inArray(bet5Tickets.bet5EventId, listedBet5EventIds)),
          columns: {
            bet5EventId: true,
          },
        })
      : [];

  const walletByEventId = new Map(userWallets.map((wallet) => [wallet.eventId, wallet]));
  const bet5ByEventId = new Map(bet5EventsList.map((bet5Event) => [bet5Event.eventId, bet5Event]));
  const eventIdByBet5EventId = new Map(bet5EventsList.map((bet5Event) => [bet5Event.id, bet5Event.eventId]));
  const bet5SalesByBet5EventId = new Map(bet5SalesRows.map((row) => [row.bet5EventId, Number(row.total ?? 0)]));
  const bet5TicketCountByEventId = new Map<string, number>();

  userBet5Tickets.forEach((ticket) => {
    const eventId = eventIdByBet5EventId.get(ticket.bet5EventId);
    if (!eventId) return;
    const current = bet5TicketCountByEventId.get(eventId) ?? 0;
    bet5TicketCountByEventId.set(eventId, current + 1);
  });

  const eventGroups = listedEvents.reduce<
    Record<
      string,
      {
        event: (typeof listedRaces)[0]['event'];
        races: typeof listedRaces;
        balance: number;
        totalLoaned: number;
        bet5Id?: string | undefined;
        bet5Status?: string | undefined;
        hasPurchasedBet5: boolean;
        purchasedBet5Count: number;
        hasWallet: boolean;
      }
    >
  >((acc, event) => {
    const eventId = event.id;
    if (!acc[eventId]) {
      const wallet = walletByEventId.get(eventId);
      const bet5 = bet5ByEventId.get(eventId);
      const bet5TicketCount = bet5TicketCountByEventId.get(eventId) ?? 0;
      acc[eventId] = {
        event,
        races: [],
        balance: wallet?.balance ?? 0,
        totalLoaned: wallet?.totalLoaned ?? 0,
        bet5Id: bet5?.id,
        bet5Status: bet5?.status,
        hasPurchasedBet5: bet5TicketCount > 0,
        purchasedBet5Count: bet5TicketCount,
        hasWallet: Boolean(wallet),
      };
    }
    return acc;
  }, {});

  for (const race of listedRaces) {
    eventGroups[race.eventId]?.races.push(race);
  }

  return Object.values(eventGroups)
    .sort((a, b) => {
      if (a.event.status !== b.event.status) return a.event.status === 'ACTIVE' ? -1 : 1;
      return new Date(b.event.date).getTime() - new Date(a.event.date).getTime();
    })
    .map((group) => {
      // BET5 対象レースの並びと締切有無。対象レースが1つでも締め切られていたら実質購入不可として扱う
      const bet5 = bet5ByEventId.get(group.event.id);
      const raceById = new Map(group.races.map((race) => [race.id, race]));
      const bet5TargetRaces = bet5
        ? [bet5.race1Id, bet5.race2Id, bet5.race3Id, bet5.race4Id, bet5.race5Id]
            .map((raceId) => raceById.get(raceId))
            .filter((race): race is NonNullable<typeof race> => race !== undefined)
        : [];

      // 配当プールは払戻計算の calculateBet5Payout と同じ式。初期プールと売上とキャリーオーバーの合計
      const bet5Pot = bet5
        ? bet5.initialPot + (bet5SalesByBet5EventId.get(bet5.id) ?? 0) + group.event.carryoverAmount
        : 0;

      return {
        ...group,
        races: [...group.races].sort((a, b) => (a.raceNumber ?? 999) - (b.raceNumber ?? 999)),
        bet5Pot,
        bet5HasClosedRace: bet5TargetRaces.some((race) => race.status !== 'SCHEDULED'),
      };
    });
}
