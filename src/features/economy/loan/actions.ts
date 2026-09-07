'use server';

import { isEligibleForLoan } from '@/entities/wallet';
import { db } from '@/shared/db';
import { events, transactions, wallets } from '@/shared/db/schema';
import { ActionError, requireUser, runAction } from '@/shared/utils/admin';
import { and, eq, sql } from 'drizzle-orm';

// 特別融資を借り入れる。本番では throw のメッセージがマスクされるため、
// 対象外・借入済みなどの想定内エラーは throw せず { success: false, error } で返す。
// 画面の鮮度は呼び手の router.refresh に任せ、revalidatePath は呼ばない
export async function borrowLoan(eventId: string) {
  return runAction(() => borrowLoanInner(eventId));
}

async function borrowLoanInner(eventId: string) {
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

  if (!event.loanEnabled) {
    throw new ActionError('このイベントでは借入機能が無効です');
  }

  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.userId, userId), eq(wallets.eventId, eventId)),
  });

  if (!wallet) {
    throw new ActionError('ウォレットが見つかりません');
  }

  if (!isEligibleForLoan(wallet.balance, event.distributeAmount, wallet.totalLoaned > 0, event.loanThresholdPercent)) {
    if (wallet.totalLoaned > 0) {
      throw new ActionError('既に借り入れ済みです');
    }
    throw new ActionError('現在の残高では借り入れできません');
  }

  await db.transaction(async (tx) => {
    const lockKey = `loan:${wallet.id}`;
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

    const lockedEvent = await tx.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (lockedEvent?.status !== 'ACTIVE') {
      throw new ActionError('このイベントは現在開催中ではありません');
    }

    if (!lockedEvent.loanEnabled) {
      throw new ActionError('このイベントでは借入機能が無効です');
    }

    const loanAmount = lockedEvent.loanAmount ?? lockedEvent.distributeAmount;

    const lockedWallet = await tx.query.wallets.findFirst({
      where: eq(wallets.id, wallet.id),
    });

    if (!lockedWallet) {
      throw new ActionError('ウォレットが見つかりません');
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
        throw new ActionError('既に借り入れ済みです');
      }
      throw new ActionError('現在の残高では借り入れできません');
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
}
