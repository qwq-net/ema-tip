'use server';

import { isValidUserName } from '@/entities/user';
import { signIn, signOut } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { guestCodes, users } from '@/shared/db/schema';
import { getLoginAttemptRecord, isLoginLocked, recordLoginFailure } from '@/shared/lib/login-rate-limit';
import { getClientIp } from '@/shared/utils/get-client-ip';
import { eq } from 'drizzle-orm';

export async function discordSignIn() {
  await signIn('discord', { redirectTo: '/mypage' });
}

export async function checkIpLockStatus() {
  const ip = await getClientIp();
  const attempt = await getLoginAttemptRecord(ip);

  if (attempt?.lockedUntil && attempt.lockedUntil > Date.now()) {
    const diff = attempt.lockedUntil - Date.now();
    return {
      isLocked: true,
      lockedUntil: new Date(attempt.lockedUntil),
      remainingMinutes: Math.ceil(diff / 60000),
    };
  }

  return { isLocked: false };
}

// ゲスト登録の事前検証。authorize と同じく失敗を記録しないと、
// この action 経由でコードとユーザー名を無制限に試せてしまう。
export async function validateGuestRegistration(code: string, username: string) {
  const ip = await getClientIp();
  const attemptRecord = await getLoginAttemptRecord(ip);

  if (isLoginLocked(attemptRecord)) {
    const remaining = Math.ceil((attemptRecord!.lockedUntil! - Date.now()) / 60000);
    return { error: 'RateLimitExceeded', remainingMinutes: remaining };
  }

  // コピペ由来の前後空白・改行で有効なコードが不一致になり、共有IPのロックを誘発するため正規化する
  const normalizedCode = code.trim();

  if (!isValidUserName(username)) {
    return { error: 'InvalidUsername' };
  }

  const guestCode = await db.query.guestCodes.findFirst({
    where: eq(guestCodes.code, normalizedCode),
  });

  if (!guestCode || guestCode.disabledAt) {
    await recordLoginFailure(ip, attemptRecord, true);
    return { error: 'InvalidGuestCode' };
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.name, username),
  });

  if (existingUser) {
    await recordLoginFailure(ip, attemptRecord);
    return { error: 'UsernameTaken' };
  }

  return { success: true };
}

export async function logout() {
  await signOut({ redirectTo: '/login' });
}
