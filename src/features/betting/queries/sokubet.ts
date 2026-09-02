import { db } from '@/shared/db';
import { bet5Events, bet5Tickets, raceInstances, wallets } from '@/shared/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

export async function getSokubetDashboardData(userId: string) {
  const [activeEvents, userWallets] = await Promise.all([
    db.query.events.findMany({
      where: (events, { eq }) => eq(events.status, 'ACTIVE'),
      columns: { id: true },
    }),
    db.query.wallets.findMany({
      where: eq(wallets.userId, userId),
    }),
  ]);

  if (activeEvents.length === 0) {
    return [];
  }

  const activeEventIds = activeEvents.map((event) => event.id);
  const [activeRaces, bet5EventsList] = await Promise.all([
    db.query.raceInstances.findMany({
      where: inArray(raceInstances.eventId, activeEventIds),
      orderBy: [desc(raceInstances.date)],
      with: {
        event: true,
        venue: true,
        // UIは頭数と着順入力済みかしか使わないため、entries はそのカラムだけ返す
        entries: { columns: { finishPosition: true } },
      },
    }),
    db.query.bet5Events.findMany({
      where: inArray(bet5Events.eventId, activeEventIds),
      columns: {
        id: true,
        eventId: true,
        status: true,
        race1Id: true,
        race2Id: true,
        race3Id: true,
        race4Id: true,
        race5Id: true,
      },
    }),
  ]);

  const activeBet5EventIds = bet5EventsList.map((event) => event.id);
  const userBet5Tickets =
    activeBet5EventIds.length > 0
      ? await db.query.bet5Tickets.findMany({
          where: and(eq(bet5Tickets.userId, userId), inArray(bet5Tickets.bet5EventId, activeBet5EventIds)),
          columns: {
            bet5EventId: true,
          },
        })
      : [];

  const walletByEventId = new Map(userWallets.map((wallet) => [wallet.eventId, wallet]));
  const bet5ByEventId = new Map(bet5EventsList.map((bet5Event) => [bet5Event.eventId, bet5Event]));
  const eventIdByBet5EventId = new Map(bet5EventsList.map((bet5Event) => [bet5Event.id, bet5Event.eventId]));
  const bet5TicketCountByEventId = new Map<string, number>();

  userBet5Tickets.forEach((ticket) => {
    const eventId = eventIdByBet5EventId.get(ticket.bet5EventId);
    if (!eventId) return;
    const current = bet5TicketCountByEventId.get(eventId) ?? 0;
    bet5TicketCountByEventId.set(eventId, current + 1);
  });

  const eventGroups = activeRaces.reduce<
    Record<
      string,
      {
        event: (typeof activeRaces)[0]['event'];
        races: typeof activeRaces;
        balance: number;
        totalLoaned: number;
        bet5Id?: string;
        bet5Status?: string;
        hasPurchasedBet5: boolean;
        purchasedBet5Count: number;
        hasWallet: boolean;
      }
    >
  >((acc, race) => {
    const eventId = race.event.id;
    if (!acc[eventId]) {
      const wallet = walletByEventId.get(eventId);
      const bet5 = bet5ByEventId.get(eventId);
      const bet5TicketCount = bet5TicketCountByEventId.get(eventId) ?? 0;
      acc[eventId] = {
        event: race.event,
        races: [],
        balance: wallet?.balance ?? 0,
        totalLoaned: wallet?.totalLoaned ?? 0,
        bet5Id: bet5?.id,
        bet5Status: bet5?.status,
        hasPurchasedBet5: bet5TicketCount > 0,
        purchasedBet5Count: bet5TicketCount,
        hasWallet: !!wallet,
      };
    }
    acc[eventId].races.push(race);
    return acc;
  }, {});

  return Object.values(eventGroups)
    .sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime())
    .map((group) => {
      // BET5 対象レースの並びと締切有無。対象レースが1つでも締め切られていたら実質購入不可として扱う
      const bet5 = bet5ByEventId.get(group.event.id);
      const raceById = new Map(group.races.map((race) => [race.id, race]));
      const bet5TargetRaces = bet5
        ? [bet5.race1Id, bet5.race2Id, bet5.race3Id, bet5.race4Id, bet5.race5Id]
            .map((raceId) => raceById.get(raceId))
            .filter((race): race is NonNullable<typeof race> => race !== undefined)
        : [];

      return {
        ...group,
        races: group.races.sort((a, b) => (a.raceNumber || 999) - (b.raceNumber || 999)),
        bet5TargetRaceNumbers: bet5TargetRaces.map((race) => race.raceNumber),
        bet5HasClosedRace: bet5TargetRaces.some((race) => race.status !== 'SCHEDULED'),
      };
    });
}
