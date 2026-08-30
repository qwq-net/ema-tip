'use server';

import { db } from '@/shared/db';
import { transactions, wallets } from '@/shared/db/schema';
import { ADMIN_ERRORS, requireUser } from '@/shared/utils/admin';
import { desc, eq } from 'drizzle-orm';

export async function getEventWallets() {
  const session = await requireUser();

  return db.query.wallets.findMany({
    where: eq(wallets.userId, session.user!.id!),
    orderBy: [desc(wallets.createdAt)],
    with: {
      event: true,
    },
  });
}

export async function getWalletTransactions(walletId: string) {
  const session = await requireUser();

  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.id, walletId),
    columns: { id: true, userId: true },
  });

  if (!wallet || wallet.userId !== session.user!.id) {
    throw new Error(ADMIN_ERRORS.UNAUTHORIZED);
  }

  return db.query.transactions.findMany({
    where: eq(transactions.walletId, walletId),
    with: {
      bet: {
        with: {
          race: {
            with: {
              venue: true,
            },
          },
        },
      },
      event: true,
      bet5Ticket: {
        with: {
          bet5Event: {
            with: {
              event: true,
            },
          },
        },
      },
    },
    // 一括ベットは createdAt が完全一致するため、id で並びを安定させる
    orderBy: [desc(transactions.createdAt), desc(transactions.id)],
    // ベットは組み合わせ1点ごとに1行入るため無制限だと数千行になる
    // ponytail: 直近200件固定。全件が必要になったらページングを入れる
    limit: 200,
  });
}
