'use server';

import { BET_TYPE_SELECTION_COUNTS, BET_TYPES, BetDetail, BetType } from '@/entities/bet';
import { normalizeSelections } from '@/entities/bet/lib/payout';
import { db } from '@/shared/db';
import { betGroups, bets, events, raceEntries, raceInstances, transactions, wallets } from '@/shared/db/schema';
import { ActionError, ADMIN_ERRORS, requireUser, runAction } from '@/shared/utils/admin';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { calculateAllProvisionalOdds, calculateOdds } from './logic/odds';

const BATCH_SIZE = 100;
const MAX_COMBINATIONS = 1000;

type PlaceBetsArgs = {
  raceId: string;
  walletId: string;
  betType: BetType;
  combinations: number[][];
  amountPerBet: number;
};

// 馬券を購入する。締切・残高不足などの想定内エラーは throw せず
// { success: false, error } で返す（本番では throw のメッセージがマスクされるため）。
export async function placeBets(args: PlaceBetsArgs) {
  return runAction(() => placeBetsInner(args));
}

async function placeBetsInner({ raceId, walletId, betType, combinations, amountPerBet }: PlaceBetsArgs) {
  const session = await requireUser();

  if (combinations.length === 0 || combinations.length > MAX_COMBINATIONS) {
    throw new ActionError(ADMIN_ERRORS.INVALID_INPUT);
  }

  if (amountPerBet <= 0 || amountPerBet % 100 !== 0) {
    throw new ActionError(ADMIN_ERRORS.INVALID_AMOUNT);
  }

  const totalAmount = amountPerBet * combinations.length;

  const race = await db.query.raceInstances.findFirst({
    where: eq(raceInstances.id, raceId),
  });

  if (!race) {
    throw new ActionError(ADMIN_ERRORS.NOT_FOUND);
  }

  if (race.status !== 'SCHEDULED') {
    throw new ActionError(ADMIN_ERRORS.RACE_CLOSED);
  }

  if (race.closingAt && new Date() > new Date(race.closingAt)) {
    throw new ActionError(ADMIN_ERRORS.DEADLINE_EXCEEDED);
  }

  // イベント終了後に SCHEDULED のまま残ったレースへのベットで順位確定後の残高が動くのを防ぐ
  const event = await db.query.events.findFirst({
    where: eq(events.id, race.eventId),
    columns: { id: true, status: true },
  });
  if (!event || event.status !== 'ACTIVE') {
    throw new ActionError(ADMIN_ERRORS.RACE_CLOSED);
  }

  // 組み合わせの中身はクライアント任せにせず、要素数・整数性・実在番号・重複をここで検証する
  const entries = await db.query.raceEntries.findMany({
    where: eq(raceEntries.raceId, raceId),
    columns: { horseNumber: true, bracketNumber: true, status: true },
  });
  const isBracket = betType === BET_TYPES.BRACKET_QUINELLA;
  const validNumbers = new Set(
    entries
      .filter((e) => e.status === 'ENTRANT')
      .map((e) => (isBracket ? e.bracketNumber : e.horseNumber))
      .filter((n): n is number => n !== null)
  );
  const selectionCount = BET_TYPE_SELECTION_COUNTS[betType];
  for (const combo of combinations) {
    const isValid =
      Array.isArray(combo) &&
      combo.length === selectionCount &&
      combo.every((n) => Number.isInteger(n) && validNumbers.has(n)) &&
      // 枠連のみ同一番号の組み合わせを許容する
      (isBracket || new Set(combo).size === combo.length);
    if (!isValid) {
      throw new ActionError(ADMIN_ERRORS.INVALID_INPUT);
    }
  }

  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.id, walletId),
  });

  if (!wallet) {
    throw new ActionError(ADMIN_ERRORS.NOT_FOUND);
  }

  if (wallet.userId !== session.user!.id) {
    throw new ActionError(ADMIN_ERRORS.INVALID_WALLET);
  }

  if (wallet.eventId !== race.eventId) {
    throw new ActionError(ADMIN_ERRORS.INVALID_WALLET);
  }

  if (wallet.balance < totalAmount) {
    throw new ActionError(ADMIN_ERRORS.INSUFFICIENT_BALANCE);
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`bet:${walletId}`}))`);

    const lockedRace = await tx.query.raceInstances.findFirst({
      where: eq(raceInstances.id, raceId),
    });

    if (!lockedRace || lockedRace.status !== 'SCHEDULED') {
      throw new ActionError(ADMIN_ERRORS.RACE_CLOSED);
    }

    if (lockedRace.closingAt && new Date() > new Date(lockedRace.closingAt)) {
      throw new ActionError(ADMIN_ERRORS.DEADLINE_EXCEEDED);
    }

    const lockedWallet = await tx.query.wallets.findFirst({
      where: eq(wallets.id, walletId),
    });

    if (!lockedWallet || lockedWallet.balance < totalAmount) {
      throw new ActionError(ADMIN_ERRORS.INSUFFICIENT_BALANCE);
    }

    const [betGroup] = await tx
      .insert(betGroups)
      .values({
        userId: session.user!.id!,
        raceId,
        walletId,
        type: betType,
        totalAmount,
      })
      .returning();

    for (let i = 0; i < combinations.length; i += BATCH_SIZE) {
      const batch = combinations.slice(i, i + BATCH_SIZE);

      const insertedBets = await tx
        .insert(bets)
        .values(
          batch.map((combo) => ({
            userId: session.user!.id!,
            raceId,
            walletId,
            betGroupId: betGroup.id,
            details: { type: betType, selections: combo },
            amount: amountPerBet,
            status: 'PENDING' as const,
          }))
        )
        .returning({ id: bets.id });

      await tx.insert(transactions).values(
        insertedBets.map((bet) => ({
          walletId,
          type: 'BET' as const,
          amount: -amountPerBet,
          referenceId: bet.id,
        }))
      );
    }

    await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} - ${totalAmount}`,
      })
      .where(eq(wallets.id, walletId));
  });

  revalidatePath('/mypage');
  revalidatePath(`/races/${raceId}`);

  // オッズ再計算は応答を待たないファイア・アンド・フォーゲット
  void calculateOdds(raceId).catch((err) => {
    console.error('Failed to calculate odds:', err);
  });
}

export async function getUserBetGroupsForRace(raceId: string) {
  const session = await requireUser();

  const race = await db.query.raceInstances.findFirst({
    where: eq(raceInstances.id, raceId),
    columns: { status: true },
  });

  const groups = await db.query.betGroups.findMany({
    where: (bg, { and, eq }) => and(eq(bg.userId, session.user!.id!), eq(bg.raceId, raceId)),
    orderBy: (bg, { desc }) => [desc(bg.createdAt)],
    with: {
      bets: true,
    },
  });

  if (race?.status === 'CLOSED') {
    const provisionalOdds = await calculateAllProvisionalOdds(raceId);

    return groups.map((group) => ({
      ...group,
      bets: group.bets.map((bet) => {
        const details = bet.details as BetDetail;
        const betType = details.type as BetType;
        const selectionKey = normalizeSelections(betType, details.selections);

        const oddsValue = provisionalOdds[betType]?.[selectionKey];
        return {
          ...bet,
          odds: oddsValue ? oddsValue.toString() : bet.odds,
        };
      }),
    }));
  }

  return groups;
}
