'use server';

import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { events, transactions, wallets } from '@/shared/db/schema';
import { firstRow } from '@/shared/utils/first-row';
import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function claimEvent(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const userId = session.user.id;

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.status !== 'ACTIVE') {
    throw new Error('このイベントは現在開催中ではありません');
  }

  await db.transaction(async (tx) => {
    const lockKey = `claim:${userId}:${eventId}`;
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

    const existingWallet = await tx.query.wallets.findFirst({
      where: and(eq(wallets.userId, userId), eq(wallets.eventId, eventId)),
    });

    if (existingWallet) {
      throw new Error('Already joined this event');
    }

    const insertedWallets = await tx
      .insert(wallets)
      .values({
        userId,
        eventId,
        balance: event.distributeAmount,
      })
      .returning();
    const newWallet = firstRow(insertedWallets, 'ウォレット');

    await tx.insert(transactions).values({
      walletId: newWallet.id,
      type: 'DISTRIBUTION',
      amount: event.distributeAmount,
      referenceId: event.id,
    });
  });

  revalidatePath('/mypage');
}
