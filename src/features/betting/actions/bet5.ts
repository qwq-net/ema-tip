'use server';

import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { bet5Tickets } from '@/shared/db/schema';
import { ActionError, runAction } from '@/shared/utils/admin';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  Bet5Selection,
  Bet5SelectionSchema,
  calculateBet5Payout,
  closeBet5Event,
  createBet5Event,
  placeBet5Bet,
  updateBet5InitialPot,
} from '../logic/bet5';

const Bet5UnitAmountSchema = z
  .number()
  .int()
  .min(100)
  .refine((value) => value % 100 === 0, { message: 'unitAmount must be a multiple of 100' });

export async function createBet5EventAction({
  eventId,
  raceIds,
  initialPot,
}: {
  eventId: string;
  raceIds: [string, string, string, string, string];
  initialPot: number;
}) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const bet5Event = await createBet5Event({ eventId, raceIds, initialPot });
  revalidatePath(`/admin/events/${eventId}`);
  return bet5Event;
}

export async function closeBet5EventAction(bet5EventId: string, eventId: string) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const updated = await closeBet5Event(bet5EventId);
  revalidatePath(`/admin/events/${eventId}`);
  return updated;
}

export async function updateBet5InitialPotAction(bet5EventId: string, eventId: string, initialPot: number) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const updated = await updateBet5InitialPot(bet5EventId, initialPot);
  revalidatePath(`/admin/events/${eventId}`);
  return updated;
}

// BET5 の投票を行う。締切済み・残高不足などの想定内エラーは throw せず
// { success: false, error } で返す（本番では throw のメッセージがマスクされるため）。
export async function placeBet5BetAction({
  bet5EventId,
  eventId,
  unitAmount,
  selections,
}: {
  bet5EventId: string;
  eventId: string;
  unitAmount: number;
  selections: Bet5Selection;
}) {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user) {
      throw new Error('Unauthorized');
    }

    const validation = Bet5SelectionSchema.safeParse(selections);
    if (!validation.success) {
      throw new ActionError('選択内容が正しくありません');
    }

    const amountValidation = Bet5UnitAmountSchema.safeParse(unitAmount);
    if (!amountValidation.success) {
      throw new ActionError('投票金額が正しくありません');
    }

    const ticket = await placeBet5Bet({
      userId: session.user.id!,
      bet5EventId,
      unitAmount: amountValidation.data,
      selections: validation.data,
    });

    revalidatePath(`/events/${eventId}/bet5`);
    return ticket;
  });
}

export async function calculateBet5PayoutAction(bet5EventId: string, eventId: string) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const result = await calculateBet5Payout(bet5EventId);
  revalidatePath(`/admin/events/${eventId}`);
  return result;
}

export async function getBet5TicketsAction(bet5EventId: string) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const tickets = await db.query.bet5Tickets.findMany({
    where: eq(bet5Tickets.bet5EventId, bet5EventId),
    with: {
      user: {
        columns: {
          name: true,
        },
      },
    },
    orderBy: (bet5Tickets, { desc }) => [desc(bet5Tickets.createdAt)],
  });

  return tickets;
}
