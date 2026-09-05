import { ROLES } from '@/entities/user/constants';
import { auth } from '@/shared/config/auth';
import type { Session } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export const ADMIN_ERRORS = {
  UNAUTHORIZED: '認証されていません',
  NOT_FOUND: 'データが見つかりません',
  INVALID_INPUT: '入力内容が無効です',
  RACE_CLOSED: 'このレースの受付は終了しています',
  DEADLINE_EXCEEDED: 'このレースは締切時刻を過ぎています',
  INSUFFICIENT_BALANCE: '残高が不足しています',
  INVALID_WALLET: '不正なウォレットです',
  INVALID_AMOUNT: '金額が無効です',
  BET_TYPE_NOT_ALLOWED: 'このレースでは購入できない馬券種別です',
} as const;

import { ActionError } from '@/shared/utils/action-result';

export { ActionError, runAction, type ActionResult } from '@/shared/utils/action-result';

/** user が確実に存在するセッション。requireUser と requireAdmin と requireLoginPage が返す */
export type AuthedSession = Session & { user: NonNullable<Session['user']> };

/** 管理者ガード。ADMIN ロールでなければ ActionError を投げる。 */
export async function requireAdmin(): Promise<AuthedSession> {
  const session = await auth();
  if (session?.user?.role !== ROLES.ADMIN) {
    throw new ActionError(ADMIN_ERRORS.UNAUTHORIZED);
  }
  return { ...session, user: session.user };
}

/** ログインガード。未ログインなら ActionError を投げる。 */
export async function requireUser(): Promise<AuthedSession> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ActionError(ADMIN_ERRORS.UNAUTHORIZED);
  }
  return { ...session, user: session.user };
}

/**
 * server component ページ用のログインガード。
 * 未ログインなら /login へ redirect して戻らず、ログイン済みならセッションを返す。
 * エラー表示にしたい server action では requireUser を使うこと。
 */
export async function requireLoginPage(): Promise<AuthedSession> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
  return { ...session, user: session.user };
}

export function revalidateRacePaths(raceId: string) {
  revalidatePath('/admin/races');
  revalidatePath(`/admin/races/${raceId}`);
  revalidatePath(`/races/${raceId}`);
  revalidatePath(`/races/${raceId}/standby`);
  revalidatePath('/mypage');
}
