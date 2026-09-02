'use server';

import { db } from '@/shared/db';
import { transactions, wallets } from '@/shared/db/schema';
import { requireUser } from '@/shared/utils/admin';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { formatChartDate, getActionName, getTransactionDescription } from './utils';

import type { AssetHistoryPoint, EventStats } from './utils';

type StatTransaction = {
  id: string;
  type: string;
  amount: number;
  createdAt: Date;
  wallet: {
    eventId: string;
  };
  bet: {
    race: {
      name: string;
    } | null;
  } | null;
};

// 直前の履歴ポイントと type・eventId・label が一致する同種の取引かを判定する。
// true なら新規ポイントを追加せず直前ポイントへ合算する。履歴が空なら false。
function shouldGroupGlobalHistoryPoint(
  lastPoint: AssetHistoryPoint | undefined,
  transaction: { type: string },
  eventId: string,
  label: string
): boolean {
  if (!lastPoint) return false;
  return lastPoint.type === transaction.type && lastPoint.eventId === eventId && lastPoint.label === label;
}

// イベント別履歴版のグルーピング判定。eventId の代わりに raceName で同一性を見る。
function shouldGroupEventHistoryPoint(
  lastPoint: AssetHistoryPoint | undefined,
  transaction: { type: string },
  raceName: string | undefined,
  label: string
): boolean {
  if (!lastPoint) return false;
  return lastPoint.type === transaction.type && lastPoint.raceName === raceName && lastPoint.label === label;
}

export async function getGlobalStats() {
  const session = await requireUser();
  const userId = session.user!.id!;

  const userWallets = await db.query.wallets.findMany({
    where: eq(wallets.userId, userId),
    with: {
      event: true,
    },
    orderBy: desc(wallets.createdAt),
  });

  let totalBalance = 0;
  let totalLoan = 0;

  const eventMap = new Map<string, EventStats>();
  const walletIds: string[] = [];

  for (const wallet of userWallets) {
    totalBalance += wallet.balance;
    totalLoan += wallet.totalLoaned;
    walletIds.push(wallet.id);

    eventMap.set(wallet.eventId, {
      id: wallet.eventId,
      name: wallet.event.name,
      balance: wallet.balance,
      loan: wallet.totalLoaned,
      net: wallet.balance - wallet.totalLoaned,
      history: [],
      logs: [],
    });
  }

  const totalNet = totalBalance - totalLoan;

  if (walletIds.length === 0) {
    return {
      globalHistory: [],
      totalBalance: 0,
      totalLoan: 0,
      totalNet: 0,
      events: [],
    };
  }

  // p資産推移チャートのため全取引を上限なしで取得する。最大30人・低頻度開催の
  // 想定では実害がないため意図的にこのままとする。重くなったらイベント単位の遅延読み込みへ
  const allTransactions = await db.query.transactions.findMany({
    where: inArray(transactions.walletId, walletIds),
    // 一括ベットは createdAt が完全一致するため、id で並びを安定させる
    orderBy: [asc(transactions.createdAt), asc(transactions.id)],
    with: {
      wallet: {
        columns: {
          eventId: true,
        },
      },
      bet: {
        columns: {
          id: true,
        },
        with: {
          race: {
            columns: {
              name: true,
            },
          },
        },
      },
    },
  });

  let currentGlobalBalance = 0;
  const globalHistory: AssetHistoryPoint[] = [];
  const eventCurrentBalances = new Map<string, number>();

  for (const transaction of allTransactions) {
    const eventId = transaction.wallet.eventId;
    const eventData = eventMap.get(eventId);
    const transactionRaceName = transaction.bet?.race?.name;
    const actionName = getActionName(transaction.type);
    const eventName = eventData?.name || '';

    const globalLabel = transactionRaceName
      ? `${eventName} ${transactionRaceName} ${actionName}`
      : `${eventName} ${actionName}`;

    if (transaction.type !== 'LOAN') {
      currentGlobalBalance += transaction.amount;
    }

    const lastGlobalPoint = globalHistory[globalHistory.length - 1];
    const shouldGroupGlobal = shouldGroupGlobalHistoryPoint(lastGlobalPoint, transaction, eventId, globalLabel);

    updateHistoryPoint(
      globalHistory,
      transaction,
      currentGlobalBalance,
      shouldGroupGlobal,
      globalLabel,
      undefined,
      true
    );

    if (eventData) {
      if (!eventCurrentBalances.has(eventId)) {
        eventCurrentBalances.set(eventId, 0);
      }

      let eventBalance = eventCurrentBalances.get(eventId)!;
      if (transaction.type !== 'LOAN') {
        eventBalance += transaction.amount;
        eventCurrentBalances.set(eventId, eventBalance);
      }

      const lastEventPoint = eventData.history[eventData.history.length - 1];
      const eventLabel = transactionRaceName ? `${transactionRaceName} ${actionName}` : actionName;
      const shouldGroupEvent = shouldGroupEventHistoryPoint(
        lastEventPoint,
        transaction,
        transactionRaceName,
        eventLabel
      );

      updateHistoryPoint(
        eventData.history,
        transaction,
        eventBalance,
        shouldGroupEvent,
        eventLabel,
        transactionRaceName,
        false
      );

      eventData.logs.push({
        id: transaction.id,
        createdAt: transaction.createdAt,
        type: transaction.type,
        amount: transaction.amount,
        description: getTransactionDescription(transaction),
      });
    }
  }

  for (const event of eventMap.values()) {
    event.logs.reverse();
  }

  return {
    globalHistory,
    totalBalance,
    totalLoan,
    totalNet,
    events: Array.from(eventMap.values()),
  };
}

function updateHistoryPoint(
  history: AssetHistoryPoint[],
  transaction: StatTransaction,
  currentBalance: number,
  shouldGroup: boolean,
  label: string,
  raceName: string | undefined,
  isGlobal: boolean
) {
  const lastPoint = history[history.length - 1];

  if (lastPoint && shouldGroup) {
    lastPoint.balance = currentBalance;
    lastPoint.amount += transaction.amount;
    lastPoint.date = formatChartDate(transaction.createdAt, isGlobal);
    lastPoint.timestamp = transaction.createdAt.getTime();
    lastPoint.label = label;
  } else {
    history.push({
      date: formatChartDate(transaction.createdAt, isGlobal),
      timestamp: transaction.createdAt.getTime(),
      balance: currentBalance,
      label: label,
      amount: transaction.amount,
      type: transaction.type,
      eventId: transaction.wallet.eventId,
      raceName: raceName,
    });
  }
}
