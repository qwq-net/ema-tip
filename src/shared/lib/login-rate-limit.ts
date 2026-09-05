import { redis } from '@/shared/lib/redis';

const TTL_SECONDS = 24 * 60 * 60;

export interface LoginAttemptRecord {
  attempts: number;
  blockLevel: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

function keyFor(ip: string): string {
  return `ratelimit:ip:${ip}`;
}

/**
 * IP のログイン失敗記録を返す。未記録なら null。
 * 壊れた値を残すと該当 IP のログインが TTL まで失敗し続けるため、
 * 値が JSON として壊れている場合は削除して null を返す。
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

/** ロック中かを返す。真なら record と lockedUntil が確定するため、解除時刻をそのまま読める。 */
export function isLoginLocked(
  record: LoginAttemptRecord | null
): record is LoginAttemptRecord & { lockedUntil: number } {
  return (record?.lockedUntil ?? 0) > Date.now();
}

/**
 * ロックを掛ける失敗回数のしきい値を返す。
 * 通常の失敗は 5 回で掛かる。isStrict は総当たりを疑う失敗で、
 * 未ロックの IP は 3 回、一度ロックされた IP は 1 回で再びロックする。
 */
function lockThreshold(isStrict: boolean, blockLevel: number): number {
  if (!isStrict) return 5;
  return blockLevel > 0 ? 1 : 3;
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
  const currentAttempts = (record?.attempts ?? 0) + 1;
  const currentBlockLevel = record?.blockLevel ?? 0;

  let lockedUntil: number | null = null;
  let newBlockLevel = currentBlockLevel;
  let newAttempts = currentAttempts;

  const threshold = lockThreshold(isStrict, currentBlockLevel);

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
