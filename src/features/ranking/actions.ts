'use server';

import { calculateNetBalance } from '@/entities/wallet';
import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { events, wallets } from '@/shared/db/schema';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { type RankingData } from '@/entities/ranking';

export type RankingDisplayMode = 'HIDDEN' | 'ANONYMOUS' | 'FULL' | 'FULL_WITH_LOAN';

/**
 * イベント参加ウォレットをユーザー名付きで順位順に取得する。
 * orderByNet が true の場合は借入額を差し引いた純資産の降順、false の場合は残高の降順で並べる。
 */
async function fetchRankedWallets(eventId: string, orderByNet: boolean) {
  return db.query.wallets.findMany({
    where: eq(wallets.eventId, eventId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: orderByNet
      ? [desc(sql`${wallets.balance} - ${wallets.totalLoaned}`), asc(wallets.createdAt), asc(wallets.userId)]
      : [desc(wallets.balance), asc(wallets.createdAt), asc(wallets.userId)],
  });
}

export async function getEventRanking(eventId: string): Promise<{
  ranking: RankingData[];
  published: boolean;
  distributeAmount: number;
  displayMode: RankingDisplayMode;
}> {
  const session = await auth();
  const currentUserId = session?.user?.id;

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event) {
    throw new Error('Event not found');
  }

  const distributeAmount = event.distributeAmount;
  const isFullWithLoan = event.rankingDisplayMode === 'FULL_WITH_LOAN';

  const eventWallets = await fetchRankedWallets(eventId, isFullWithLoan);

  const isHidden = event.rankingDisplayMode === 'HIDDEN';
  const isAnonymous = event.rankingDisplayMode === 'ANONYMOUS';

  // HIDDEN では残高降順の並びから実際の順位が漏れるため、順位と無関係な作成順に並べ直す
  const walletsForDisplay = isHidden
    ? [...eventWallets].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : eventWallets;

  const ranking: RankingData[] = walletsForDisplay.map((wallet, index) => {
    const isCurrentUser = wallet.userId === currentUserId;

    let name = wallet.user.name || 'Unknown';
    let rank: number | string = index + 1;
    let balance: number | string = wallet.balance;
    let totalLoaned: number | undefined = undefined;

    if (isFullWithLoan) {
      balance = calculateNetBalance(wallet.balance, wallet.totalLoaned);
      if (wallet.totalLoaned > 0) {
        totalLoaned = wallet.totalLoaned;
      }
    }

    if (isHidden) {
      name = '???';
      rank = '?';
      balance = '???';
    } else if (isAnonymous && !isCurrentUser) {
      name = '???';
    }

    // マスク時は userId から匿名化が破られないよう、実IDの代わりに表示用のキーを返す
    const shouldMaskId = isHidden || (isAnonymous && !isCurrentUser);

    return {
      rank,
      userId: shouldMaskId ? `masked-${index}` : wallet.userId,
      name,
      balance,
      isCurrentUser,
      totalLoaned,
    };
  });

  return {
    ranking,
    published: event.rankingDisplayMode !== 'HIDDEN',
    displayMode: event.rankingDisplayMode,
    distributeAmount,
  };
}

export async function getAdminEventRanking(eventId: string): Promise<{
  ranking: RankingData[];
  displayMode: RankingDisplayMode;
  distributeAmount: number;
}> {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event) {
    throw new Error('Event not found');
  }

  const distributeAmount = event.distributeAmount;

  const eventWallets = await fetchRankedWallets(eventId, true);

  const ranking: RankingData[] = eventWallets.map((wallet, index) => {
    const isCurrentUser = wallet.userId === session.user?.id;
    const name = wallet.user.name || 'Unknown';
    const rank = index + 1;
    const balance = calculateNetBalance(wallet.balance, wallet.totalLoaned);
    const totalLoaned = wallet.totalLoaned > 0 ? wallet.totalLoaned : undefined;

    return {
      rank,
      userId: wallet.userId,
      name,
      balance,
      isCurrentUser,
      totalLoaned,
    };
  });

  return {
    ranking,
    displayMode: event.rankingDisplayMode,
    distributeAmount,
  };
}

export async function updateRankingDisplayMode(eventId: string, mode: RankingDisplayMode) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  await db.update(events).set({ rankingDisplayMode: mode }).where(eq(events.id, eventId));

  raceEventEmitter.emit(RACE_EVENTS.RANKING_UPDATED, {
    eventId,
    mode,
  });

  revalidatePath('/ranking/[eventId]', 'page');
}
