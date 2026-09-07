'use server';

import { db } from '@/shared/db';
import { events, transactions, wallets } from '@/shared/db/schema';
import { ActionError, requireUser, runAction } from '@/shared/utils/admin';
import { firstRow } from '@/shared/utils/first-row';
import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// イベントに参加してウォレットを作り、配布金を積む。本番では throw のメッセージがマスクされるため、
// 開催外・二重参加などの想定内エラーは throw せず { success: false, error } で返す
export async function claimEvent(eventId: string) {
  return runAction(() => claimEventInner(eventId));
}

async function claimEventInner(eventId: string) {
  const session = await requireUser();
  const userId = session.user.id;

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event) {
    throw new ActionError('イベントが見つかりません');
  }

  if (event.status !== 'ACTIVE') {
    throw new ActionError('このイベントは現在開催中ではありません');
  }

  await db.transaction(async (tx) => {
    const lockKey = `claim:${userId}:${eventId}`;
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

    const existingWallet = await tx.query.wallets.findFirst({
      where: and(eq(wallets.userId, userId), eq(wallets.eventId, eventId)),
    });

    if (existingWallet) {
      throw new ActionError('このイベントには既に参加しています');
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
