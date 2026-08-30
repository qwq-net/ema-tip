import { calculateBet5Count, calculateBet5Dividend, isBet5Winner } from '@/entities/bet';
import { db } from '@/shared/db';
import { bet5Events, bet5Tickets, events, transactions, wallets } from '@/shared/db/schema';
import { ActionError } from '@/shared/utils/action-result';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

export const Bet5SelectionSchema = z.object({
  race1: z.array(z.string().uuid()),
  race2: z.array(z.string().uuid()),
  race3: z.array(z.string().uuid()),
  race4: z.array(z.string().uuid()),
  race5: z.array(z.string().uuid()),
});

export type Bet5Selection = z.infer<typeof Bet5SelectionSchema>;

type Bet5WinnerRow = {
  raceId: string;
  horseId: string;
};

export function resolveBet5Winners(races: string[], winnerRows: Bet5WinnerRow[]): string[] | null {
  const winnerSetByRace = new Map<string, Set<string>>();

  for (const row of winnerRows) {
    if (!winnerSetByRace.has(row.raceId)) {
      winnerSetByRace.set(row.raceId, new Set<string>());
    }
    winnerSetByRace.get(row.raceId)!.add(row.horseId);
  }

  const winners: string[] = [];
  for (const raceId of races) {
    const winnerSet = winnerSetByRace.get(raceId);
    if (!winnerSet || winnerSet.size !== 1) {
      return null;
    }
    winners.push([...winnerSet][0]);
  }

  return winners;
}

export async function createBet5Event({
  eventId,
  raceIds,
  initialPot,
}: {
  eventId: string;
  raceIds: [string, string, string, string, string];
  initialPot: number;
}) {
  const [bet5Event] = await db
    .insert(bet5Events)
    .values({
      eventId,
      race1Id: raceIds[0],
      race2Id: raceIds[1],
      race3Id: raceIds[2],
      race4Id: raceIds[3],
      race5Id: raceIds[4],
      initialPot,
      status: 'SCHEDULED',
    })
    .returning();
  return bet5Event;
}

export async function closeBet5Event(bet5EventId: string) {
  const current = await db.query.bet5Events.findFirst({
    where: eq(bet5Events.id, bet5EventId),
    columns: { id: true, status: true },
  });

  if (!current) {
    throw new Error('BET5 event not found');
  }

  if (current.status !== 'SCHEDULED') {
    throw new Error('SCHEDULED 状態の BET5 イベントのみ締切できます');
  }

  const [updated] = await db
    .update(bet5Events)
    .set({ status: 'CLOSED' })
    .where(eq(bet5Events.id, bet5EventId))
    .returning();
  return updated;
}

export async function updateBet5InitialPot(bet5EventId: string, initialPot: number) {
  const normalizedPot = Math.max(0, Math.floor(initialPot));

  const current = await db.query.bet5Events.findFirst({
    where: eq(bet5Events.id, bet5EventId),
    columns: {
      id: true,
      status: true,
    },
  });

  if (!current) {
    throw new Error('BET5 event not found');
  }

  if (current.status === 'FINALIZED') {
    throw new Error('BET5 event already finalized');
  }

  const [updated] = await db
    .update(bet5Events)
    .set({ initialPot: normalizedPot })
    .where(eq(bet5Events.id, bet5EventId))
    .returning();

  return updated;
}

export async function placeBet5Bet({
  userId,
  bet5EventId,
  unitAmount,
  selections,
}: {
  userId: string;
  bet5EventId: string;
  unitAmount: number;
  selections: Bet5Selection;
}) {
  return db.transaction(async (tx) => {
    const event = await tx.query.bet5Events.findFirst({
      where: eq(bet5Events.id, bet5EventId),
    });

    if (!event) throw new ActionError('BET5 event not found');

    if (event.status !== 'SCHEDULED') {
      throw new ActionError('BET5 event is closed');
    }

    // 後出し購入防止: 対象レースのいずれかが締切・確定済みなら、BET5イベントの締切忘れがあっても購入不可
    const targetRaceIds = [event.race1Id, event.race2Id, event.race3Id, event.race4Id, event.race5Id];
    const closedRaces = await tx.query.raceInstances.findMany({
      where: (raceInstances, { and, inArray, ne }) =>
        and(inArray(raceInstances.id, targetRaceIds), ne(raceInstances.status, 'SCHEDULED')),
      columns: { id: true },
    });
    if (closedRaces.length > 0) {
      throw new ActionError('対象レースが既に締め切られているため購入できません');
    }

    // 取消馬・別レースの馬IDが混ざった選択は絶対に的中しないため、出走中の馬に限定する
    const allEntries = await tx.query.raceEntries.findMany({
      where: (raceEntries, { and, inArray, eq }) =>
        and(inArray(raceEntries.raceId, targetRaceIds), eq(raceEntries.status, 'ENTRANT')),
      columns: { raceId: true, horseId: true },
    });
    const entrantsByRace = new Map<string, Set<string>>();
    for (const entry of allEntries) {
      if (!entrantsByRace.has(entry.raceId)) entrantsByRace.set(entry.raceId, new Set());
      entrantsByRace.get(entry.raceId)!.add(entry.horseId);
    }
    const selectionsByRace = [selections.race1, selections.race2, selections.race3, selections.race4, selections.race5];
    for (let i = 0; i < targetRaceIds.length; i++) {
      const entrants = entrantsByRace.get(targetRaceIds[i]);
      if (!entrants || !selectionsByRace[i].every((horseId) => entrants.has(horseId))) {
        throw new ActionError('出走取消となった馬が含まれています。選択し直してください');
      }
    }

    const count = calculateBet5Count(selections);

    if (count === 0) throw new ActionError('Invalid selection');
    const normalizedUnitAmount = Math.max(100, Math.floor(unitAmount / 100) * 100);
    const cost = count * normalizedUnitAmount;

    const wallet = await tx.query.wallets.findFirst({
      where: and(eq(wallets.userId, userId), eq(wallets.eventId, event.eventId)),
    });

    if (!wallet) throw new ActionError('Wallet not found');

    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`bet:${wallet.id}`}))`);

    const lockedEvent = await tx.query.bet5Events.findFirst({
      where: eq(bet5Events.id, bet5EventId),
    });

    if (!lockedEvent || lockedEvent.status !== 'SCHEDULED') {
      throw new ActionError('BET5 event is closed');
    }

    const lockedWallet = await tx.query.wallets.findFirst({
      where: eq(wallets.id, wallet.id),
    });

    if (!lockedWallet || lockedWallet.balance < cost) throw new ActionError('Insufficient balance');

    const [ticket] = await tx
      .insert(bet5Tickets)
      .values({
        bet5EventId,
        userId,
        walletId: wallet.id,
        race1HorseIds: selections.race1,
        race2HorseIds: selections.race2,
        race3HorseIds: selections.race3,
        race4HorseIds: selections.race4,
        race5HorseIds: selections.race5,
        amount: cost,
      })
      .returning();

    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} - ${cost}` })
      .where(eq(wallets.id, wallet.id));

    await tx.insert(transactions).values({
      walletId: wallet.id,
      type: 'BET',
      amount: -cost,
      referenceId: ticket.id,
    });

    return ticket;
  });
}

export async function calculateBet5Payout(bet5EventId: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`bet5payout:${bet5EventId}`}))`);

    const bet5Event = await tx.query.bet5Events.findFirst({
      where: eq(bet5Events.id, bet5EventId),
      with: {
        event: true,
      },
    });

    if (!bet5Event) throw new Error('Event not found');
    if (bet5Event.status === 'FINALIZED') return { success: false, message: 'Already finalized' };
    // 精算中の購入混入を防ぐため、締切済みのイベントのみ精算できる
    if (bet5Event.status !== 'CLOSED') {
      return { success: false, message: 'BET5イベントが締切状態ではありません' };
    }

    const event = bet5Event.event;
    const races = [bet5Event.race1Id, bet5Event.race2Id, bet5Event.race3Id, bet5Event.race4Id, bet5Event.race5Id];
    const allWinners = await tx.query.raceEntries.findMany({
      where: (raceEntries, { and, inArray, eq }) =>
        and(inArray(raceEntries.raceId, races), eq(raceEntries.finishPosition, 1)),
    });

    const sortedWinners = resolveBet5Winners(races, allWinners);
    if (!sortedWinners) {
      return {
        success: false,
        winCount: 0,
        dividend: 0,
        totalPot: 0,
        message: 'Not all races have exactly one winner',
      };
    }

    const tickets = await tx.query.bet5Tickets.findMany({
      where: eq(bet5Tickets.bet5EventId, bet5EventId),
    });

    const totalSales = tickets.reduce((sum, t) => sum + t.amount, 0);
    const totalPot = bet5Event.initialPot + totalSales + (event.carryoverAmount || 0);

    const winningTickets = tickets.filter((t) => {
      const ticketSelections = {
        race1: t.race1HorseIds,
        race2: t.race2HorseIds,
        race3: t.race3HorseIds,
        race4: t.race4HorseIds,
        race5: t.race5HorseIds,
      };
      return isBet5Winner(ticketSelections, sortedWinners);
    });

    const winCount = winningTickets.length;
    const winningTicketUnits = winningTickets.map((ticket) => {
      const ticketSelections = {
        race1: ticket.race1HorseIds,
        race2: ticket.race2HorseIds,
        race3: ticket.race3HorseIds,
        race4: ticket.race4HorseIds,
        race5: ticket.race5HorseIds,
      };
      const combinationCount = calculateBet5Count(ticketSelections);
      if (combinationCount <= 0) {
        return {
          ticket,
          winningUnits: 0,
        };
      }

      const unitAmountPerCombination = Math.floor(ticket.amount / combinationCount);
      const winningUnits = Math.floor(unitAmountPerCombination / 100);

      return {
        ticket,
        winningUnits,
      };
    });

    const totalWinningUnits = winningTicketUnits.reduce((sum, row) => sum + row.winningUnits, 0);
    const dividend = calculateBet5Dividend(totalPot, totalWinningUnits);

    if (winCount > 0) {
      const ticketUpdates = winningTicketUnits.map(({ ticket, winningUnits }) => ({
        id: ticket.id,
        walletId: ticket.walletId,
        payout: dividend * winningUnits,
      }));

      const ticketIds = ticketUpdates.map((t) => t.id);
      const payoutCase = sql<number>`CASE ${sql.join(
        ticketUpdates.map((t) => sql`WHEN ${bet5Tickets.id} = ${t.id} THEN ${t.payout}`),
        sql` `
      )} ELSE ${bet5Tickets.payout} END::bigint`;

      await tx.update(bet5Tickets).set({ isWin: true, payout: payoutCase }).where(inArray(bet5Tickets.id, ticketIds));

      const walletPayouts = new Map<string, number>();
      for (const t of ticketUpdates) {
        walletPayouts.set(t.walletId, (walletPayouts.get(t.walletId) || 0) + t.payout);
      }

      const walletEntries = [...walletPayouts.entries()];
      const walletIds = walletEntries.map(([id]) => id);
      const walletPayoutCase = sql<number>`CASE ${sql.join(
        walletEntries.map(([id, amount]) => sql`WHEN ${wallets.id} = ${id} THEN ${amount}`),
        sql` `
      )} ELSE 0 END::bigint`;

      await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} + ${walletPayoutCase}` })
        .where(inArray(wallets.id, walletIds));

      const transactionValues = ticketUpdates.map((t) => ({
        walletId: t.walletId,
        type: 'PAYOUT' as const,
        amount: t.payout,
        referenceId: t.id,
      }));

      await tx.insert(transactions).values(transactionValues);

      // 並行する払戻確定の加算を消さないよう、絶対値SETではなく増減分の演算で更新する
      if (Number(event.carryoverAmount) > 0) {
        await tx
          .update(events)
          .set({ carryoverAmount: sql`${events.carryoverAmount} - ${Number(event.carryoverAmount)}` })
          .where(eq(events.id, event.id));
      }
    } else {
      await tx
        .update(events)
        .set({ carryoverAmount: sql`${events.carryoverAmount} + ${bet5Event.initialPot + totalSales}` })
        .where(eq(events.id, event.id));
    }

    await tx.update(bet5Events).set({ status: 'FINALIZED' }).where(eq(bet5Events.id, bet5EventId));

    return { success: true, winCount, dividend, totalPot };
  });
}
