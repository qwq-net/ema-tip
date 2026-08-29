import { redis } from '@/shared/lib/redis';

const TTL_SECONDS = 24 * 60 * 60;

export type LoginAttemptRecord = {
  attempts: number;
  blockLevel: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
};

function keyFor(ip: string): string {
  return `ratelimit:ip:${ip}`;
}

/**
 * IP のログイン失敗記録を返す。未記録なら null。
 * 値が JSON として壊れている場合は削除して null を返す
 * （壊れた値を残すと該当 IP のログインが TTL まで失敗し続けるため）。
 */
export async function getLoginAttemptRecord(ip: string): Promise<LoginAttemptRecord | null> {
  const data = await redis.get(keyFor(ip));
  if (!data) return null;
  try {
    // SAFETY: この値は recordLoginAttempt が LoginAttemptRecord を JSON 化して保存したもの
    return JSON.parse(data) as LoginAttemptRecord;
  } catch {
    await redis.del(keyFor(ip));
    return null;
  }
}

export function isLoginLocked(record: LoginAttemptRecord | null): boolean {
  return !!record?.lockedUntil && record.lockedUntil > Date.now();
}

/**
 * ログイン失敗を 1 回分記録し、しきい値を超えたら段階的ロックを掛ける。
 * isStrict はゲストコード誤りなど総当たりを疑うべき失敗に使い、
 * 少ない試行回数で長いロックを適用する。ロック確定時は attempts を 0 に戻し
 * blockLevel を上げるため、ロック明け後の再失敗はより早く再ロックされる。
 * 使われ方: ログイン・ゲスト登録の検証で失敗が確定した直後に呼ぶ前提。
 */
export async function recordLoginFailure(
  ip: string,
  record: LoginAttemptRecord | null,
  isStrict = false
): Promise<void> {
  const currentAttempts = (record?.attempts || 0) + 1;
  const currentBlockLevel = record?.blockLevel || 0;

  let lockedUntil: number | null = null;
  let newBlockLevel = currentBlockLevel;
  let newAttempts = currentAttempts;

  const threshold = isStrict ? (currentBlockLevel > 0 ? 1 : 3) : 5;

  if (currentAttempts >= threshold) {
    let durationMinutes;
    if (isStrict) {
      const strictDurations = [60, 24 * 60];
      durationMinutes = strictDurations[Math.min(currentBlockLevel, strictDurations.length - 1)];
    } else {
      const normalDurations = [10, 60, 24 * 60];
      durationMinutes = normalDurations[Math.min(currentBlockLevel, normalDurations.length - 1)];
    }

    lockedUntil = Date.now() + durationMinutes * 60 * 1000;
    newBlockLevel = currentBlockLevel + 1;
    newAttempts = 0;
  }

  const newState: LoginAttemptRecord = {
    attempts: newAttempts,
    blockLevel: newBlockLevel,
    lockedUntil,
    lastAttemptAt: Date.now(),
  };

  await redis.set(keyFor(ip), JSON.stringify(newState), 'EX', TTL_SECONDS);
}

export async function clearLoginFailures(ip: string): Promise<void> {
  await redis.del(keyFor(ip));
}
