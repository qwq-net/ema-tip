import { notifyError } from '@/shared/lib/notify';
import { redis } from '@/shared/lib/redis';
import { z } from 'zod';

const TTL_SECONDS = 24 * 60 * 60;

// 全 IP を合算した失敗の急増を見る窓と件数。
// 単独 IP の総当たりは段階ロックが既に止めるので通知しない。危ないのは多数の IP から同時に来る場合で、
// これはロックを掛けても素通りする。想定利用者は最大 30 人で、通常は 1 日に数件しか失敗しない。
// 1 分で 10 件はその規模では明確に異常と判断できる下限として置いた。
const BURST_WINDOW_SECONDS = 60;
export const BURST_THRESHOLD = 10;
const BURST_KEY = 'login-failure-burst';

/**
 * 全体の失敗件数を数え、窓のなかで閾値へ達した瞬間に一度だけ通知する。
 * 超えた後は通知しない。続いている間ずっと鳴らすと読まれなくなるため。
 * 窓が切れれば再び 1 件目から数え直すので、続く攻撃は 1 分ごとに 1 回だけ知らせる。
 */
async function checkFailureBurst(): Promise<void> {
  const burst = await redis.incr(BURST_KEY);
  // NX 付きで毎回発行する。1 件目だけに絞ると EXPIRE が一度落ちただけで期限の無いキーが残り、
  // 閾値を超えた後は等値比較が二度と成立せず、急増検知が静かに死ぬ。NX なので窓は延びない
  await redis.expire(BURST_KEY, BURST_WINDOW_SECONDS, 'NX');
  if (burst !== BURST_THRESHOLD) return;

  void notifyError({
    kind: 'security',
    title: 'ログイン失敗が急増しています',
    detail: `${BURST_WINDOW_SECONDS} 秒のあいだに ${BURST_THRESHOLD} 件の失敗が起きました`,
  });
}

// ロック状態の記録。失敗回数は別キーのカウンタで数え、ここには持たない
const loginAttemptRecordSchema = z.object({
  blockLevel: z.number(),
  lockedUntil: z.number().nullable(),
  lastAttemptAt: z.number(),
});

export type LoginAttemptRecord = z.infer<typeof loginAttemptRecordSchema>;

function keyFor(ip: string): string {
  return `ratelimit:ip:${ip}`;
}

function attemptsKeyFor(ip: string): string {
  return `${keyFor(ip)}:attempts`;
}

/**
 * IP のロック記録を返す。未記録なら null。
 * 壊れた値を残すと該当 IP のログインが TTL まで失敗し続けるため、
 * 記録として読めない値は削除して null を返す。未記録と同じ扱いになる。
 */
export async function getLoginAttemptRecord(ip: string): Promise<LoginAttemptRecord | null> {
  const data = await redis.get(keyFor(ip));
  if (!data) return null;
  try {
    const record = loginAttemptRecordSchema.safeParse(JSON.parse(data));
    if (record.success) return record.data;
  } catch {
    // JSON として壊れている場合も下の削除へ落とす
  }
  await redis.del(keyFor(ip));
  return null;
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
 * ログイン失敗を 1 回分記録し、しきい値に達したら段階的ロックを掛ける。
 * 回数は Redis の INCR で原子的に数える。読んで足して書く方式だと bcrypt 照合の間に
 * 並列で届いた失敗が同じ古い値を読み、何件届いても 1 件分しか進まなかった。
 * isStrict はゲストコード誤りなど総当たりを疑うべき失敗に使い、
 * 少ない試行回数で長いロックを適用する。ロック確定時は回数キーを消し blockLevel を上げるため、
 * ロック明け後の再失敗はより早く再ロックされる。
 * 使われ方: ログイン・ゲスト登録の検証で失敗が確定した直後に呼ぶ前提。
 */
export async function recordLoginFailure(
  ip: string,
  record: LoginAttemptRecord | null,
  isStrict = false
): Promise<void> {
  const currentBlockLevel = record?.blockLevel ?? 0;

  await checkFailureBurst();

  const currentAttempts = await redis.incr(attemptsKeyFor(ip));
  if (currentAttempts === 1) {
    await redis.expire(attemptsKeyFor(ip), TTL_SECONDS);
  }

  if (currentAttempts < lockThreshold(isStrict, currentBlockLevel)) return;

  // ロック時間は段階ごとに伸ばし、最後の段階に達したらそこで頭打ちにする
  const durations: readonly [number, ...number[]] = isStrict ? [60, 24 * 60] : [10, 60, 24 * 60];
  const [shortest] = durations;
  const durationMinutes = durations[Math.min(currentBlockLevel, durations.length - 1)] ?? shortest;

  const newState: LoginAttemptRecord = {
    blockLevel: currentBlockLevel + 1,
    lockedUntil: Date.now() + durationMinutes * 60 * 1000,
    lastAttemptAt: Date.now(),
  };

  await redis.set(keyFor(ip), JSON.stringify(newState), 'EX', TTL_SECONDS);
  await redis.del(attemptsKeyFor(ip));
}

export async function clearLoginFailures(ip: string): Promise<void> {
  await redis.del(keyFor(ip), attemptsKeyFor(ip));
}
