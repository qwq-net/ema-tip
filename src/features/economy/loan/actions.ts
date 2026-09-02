'use server';

import { isEligibleForLoan } from '@/entities/wallet';
import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { events, transactions, wallets } from '@/shared/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function borrowLoan(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const userId = session.user.id;

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event) {
    throw new Error('イベントが見つかりません');
  }

  if (event.status !== 'ACTIVE') {
    throw new Error('このイベントは現在開催中ではありません');
  }

  if (!event.loanEnabled) {
    throw new Error('このイベントでは借入機能が無効です');
  }

  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.userId, userId), eq(wallets.eventId, eventId)),
  });

  if (!wallet) {
    throw new Error('ウォレットが見つかりません');
  }

  if (!isEligibleForLoan(wallet.balance, event.distributeAmount, wallet.totalLoaned > 0, event.loanThresholdPercent)) {
    if (wallet.totalLoaned > 0) {
      throw new Error('既に借り入れ済みです');
    }
    throw new Error('現在の残高では借り入れできません');
  }

  await db.transaction(async (tx) => {
    const lockKey = `loan:${wallet.id}`;
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

    const lockedEvent = await tx.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!lockedEvent || lockedEvent.status !== 'ACTIVE') {
      throw new Error('このイベントは現在開催中ではありません');
    }

    if (!lockedEvent.loanEnabled) {
      throw new Error('このイベントでは借入機能が無効です');
    }

    const loanAmount = lockedEvent.loanAmount ?? lockedEvent.distributeAmount;

    const lockedWallet = await tx.query.wallets.findFirst({
      where: eq(wallets.id, wallet.id),
    });

    if (!lockedWallet) {
      throw new Error('ウォレットが見つかりません');
    }

    if (
      !isEligibleForLoan(
        lockedWallet.balance,
        lockedEvent.distributeAmount,
        lockedWallet.totalLoaned > 0,
        lockedEvent.loanThresholdPercent
      )
    ) {
      if (lockedWallet.totalLoaned > 0) {
        throw new Error('既に借り入れ済みです');
      }
      throw new Error('現在の残高では借り入れできません');
    }

    await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} + ${loanAmount}`,
        totalLoaned: sql`${wallets.totalLoaned} + ${loanAmount}`,
      })
      .where(eq(wallets.id, lockedWallet.id));

    await tx.insert(transactions).values({
      walletId: lockedWallet.id,
      type: 'LOAN',
      amount: loanAmount,
      referenceId: lockedEvent.id,
    });
  });

  revalidatePath('/mypage');
  revalidatePath('/mypage/sokubet');
  revalidatePath(`/races`);
}
