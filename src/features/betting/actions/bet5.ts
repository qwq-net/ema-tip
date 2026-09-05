'use server';

import type { Bet5Selection } from '@/entities/bet/lib/bet5-event';
import { Bet5SelectionSchema, placeBet5Bet } from '@/entities/bet/lib/bet5-event';
import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { bet5Tickets } from '@/shared/db/schema';
import { ActionError, runAction } from '@/shared/utils/admin';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const Bet5UnitAmountSchema = z
  .number()
  .int()
  .min(100)
  .refine((value) => value % 100 === 0, { message: 'unitAmount must be a multiple of 100' });

// BET5 の投票を行う。本番では throw のメッセージがマスクされるため、
// 締切済み・残高不足などの想定内エラーは throw せず { success: false, error } で返す。
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
      userId: session.user.id,
      bet5EventId,
      unitAmount: amountValidation.data,
      selections: validation.data,
    });

    revalidatePath(`/events/${eventId}/bet5`);
    return ticket;
  });
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
