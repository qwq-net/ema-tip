'use server';

import { calculateNetBalance } from '@/entities/wallet';
import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { events, wallets } from '@/shared/db/schema';
import { requireUser } from '@/shared/utils/admin';
import { asc, eq } from 'drizzle-orm';

import { type RankingData, type RankingDisplayMode, rankByBasis } from '@/entities/ranking';

/**
 * イベント参加ウォレットをユーザー名付きで取得する。
 * 順位付けは呼び手が rankByBasis で行うため、同値の並びを決めるために作成順・ユーザー ID 順で返す。
 */
async function fetchEventWallets(eventId: string) {
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
    orderBy: [asc(wallets.createdAt), asc(wallets.userId)],
  });
}

/** 借金込み表示では借入を差し引いた純資産、それ以外は所持金で順位を決める。 */
function rankBasisFor(includeLoan: boolean) {
  return (wallet: { balance: number; totalLoaned: number }) =>
    includeLoan ? calculateNetBalance(wallet.balance, wallet.totalLoaned) : wallet.balance;
}

export async function getEventRanking(eventId: string): Promise<{
  eventName: string;
  ranking: RankingData[];
  published: boolean;
  distributeAmount: number;
  displayMode: RankingDisplayMode;
}> {
  const session = await requireUser();
  const currentUserId = session.user.id;

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event) {
    throw new Error('Event not found');
  }

  const distributeAmount = event.distributeAmount;
  const isFullWithLoan = event.rankingDisplayMode === 'FULL_WITH_LOAN';

  const eventWallets = await fetchEventWallets(eventId);

  const isHidden = event.rankingDisplayMode === 'HIDDEN';
  const isAnonymous = event.rankingDisplayMode === 'ANONYMOUS';

  // HIDDEN では順位が漏れないよう作成順に並べて返し、順位も伏せる
  const rankedWallets = isHidden
    ? [...eventWallets]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((wallet) => ({ ...wallet, rank: '?' as const }))
    : rankByBasis(eventWallets, rankBasisFor(isFullWithLoan));

  const ranking: RankingData[] = rankedWallets.map((wallet, index) => {
    const isCurrentUser = wallet.userId === currentUserId;
    const masked = isHidden || (isAnonymous && !isCurrentUser);

    return {
      rank: wallet.rank,
      // マスク時は userId から匿名化が破られないよう、実 ID の代わりに表示用のキーを返す
      userId: masked ? `masked-${index}` : wallet.userId,
      name: masked ? '???' : wallet.user.name || 'Unknown',
      // 所持金はそのまま出し、借入は別項目で返す。収支への反映は表示側が resultDiff で行う
      balance: isHidden ? '???' : wallet.balance,
      isCurrentUser,
      totalLoaned: isFullWithLoan && wallet.totalLoaned > 0 ? wallet.totalLoaned : undefined,
    };
  });

  return {
    eventName: event.name,
    ranking,
    published: event.rankingDisplayMode !== 'HIDDEN',
    displayMode: event.rankingDisplayMode,
    distributeAmount,
  };
}

// 管理者向けのランキングを返す。イベントが無ければ null を返し、呼び手のページが notFound へ倒す
export async function getAdminEventRanking(eventId: string): Promise<{
  ranking: Omit<RankingData, 'rank'>[];
  displayMode: RankingDisplayMode;
  distributeAmount: number;
} | null> {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event) {
    return null;
  }

  const distributeAmount = event.distributeAmount;

  // 管理者ビューは通常と借入ありを切り替えて見るため、所持金と借入を作成順のまま返し順位は表示側で付ける。
  // ここで並べ替えると同額の並びが公開側と食い違う
  const eventWallets = await fetchEventWallets(eventId);
  const ranking = eventWallets.map((wallet) => ({
    userId: wallet.userId,
    name: wallet.user.name || 'Unknown',
    balance: wallet.balance,
    isCurrentUser: wallet.userId === session.user?.id,
    totalLoaned: wallet.totalLoaned > 0 ? wallet.totalLoaned : undefined,
  }));

  return {
    ranking,
    displayMode: event.rankingDisplayMode,
    distributeAmount,
  };
}
