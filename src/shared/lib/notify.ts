import { createHash } from 'node:crypto';

/** 通知の種別。Discord 上で目視分類するための見出しに使う。 */
export type NotifyKind = 'action' | 'render' | 'infra' | 'money' | 'security' | 'config';

const KIND_LABELS = {
  action: '操作の失敗',
  render: '画面の描画失敗',
  infra: '基盤の異常',
  money: '金銭処理の失敗',
  security: '不審な挙動',
  config: '設定の異常',
} satisfies Record<NotifyKind, string>;

export interface NotifyInput {
  kind: NotifyKind;
  /** 一行の見出し。同じ事象は同じ文言にすること。抑制の指紋に使う */
  title: string;
  /** 例外メッセージなど。指紋に含めるため、毎回変わる値を入れると抑制が効かない */
  detail?: string;
  /** 原因追跡の手掛かり。指紋には含めないので、利用者 ID など毎回変わる値を入れてよい */
  context?: Record<string, string | number>;
  /** 例外そのもの。先頭のスタックを添えて、どこで落ちたかを通知に含める */
  cause?: unknown;
}

// 同じ事象を数える窓。この長さを超えると再び 1 件目として通知される
const WINDOW_SECONDS = 600;

// Redis が使えないときの数え上げ。基盤の異常そのものを通知する経路なので、
// Redis に依存しきると肝心なときに通知が出せなくなる
const localCounts = new Map<string, { count: number; expiresAt: number }>();

/** テスト用に抑制の状態を捨てる。本番のコードから呼ばないこと。 */
export function resetNotifyStateForTest(): void {
  localCounts.clear();
}

function fingerprint({ kind, title, detail }: NotifyInput): string {
  const seed = `${kind}\n${title}\n${(detail ?? '').slice(0, 200)}`;
  return createHash('sha1').update(seed).digest('hex').slice(0, 16);
}

/**
 * 発生回数を数えて返す。1 件目から順に増える。
 * Redis が使えない場合はプロセス内の数え上げに落ちる。プロセスごとに別々に数えるため、
 * 複数プロセス構成では最大でプロセス数だけ通知が重複する。基盤異常時の保険なので許容する。
 */
async function countOccurrence(key: string): Promise<number> {
  try {
    // redis.ts が接続断をこのモジュールへ通知するため、静的に import すると循環参照になる。
    // 実行時まで解決を遅らせて断つ。動的 import の結果は処理系が保持するので毎回の費用は無い
    const { redis } = await import('@/shared/lib/redis');
    const count = await redis.incr(`notify:${key}`);
    if (count === 1) await redis.expire(`notify:${key}`, WINDOW_SECONDS);
    return count;
  } catch {
    const now = Date.now();
    const current = localCounts.get(key);
    if (!current || current.expiresAt <= now) {
      localCounts.set(key, { count: 1, expiresAt: now + WINDOW_SECONDS * 1000 });
      return 1;
    }
    current.count += 1;
    return current.count;
  }
}

/**
 * 通知するべき件数かを返す。1・10・100・1000 件目だけ真になる。
 * 全件送ると壊れた画面 1 枚で通知が数千件に膨らみ、誰も読まなくなる。
 * 一方で 1 件目だけだと 1 件の事故と 1 万件の事故が見分けられないため、桁が上がるたびに知らせる。
 */
function shouldSend(count: number): boolean {
  return /^10*$/.test(String(count));
}

function buildMessage(input: NotifyInput, count: number): string {
  const lines = [`**${KIND_LABELS[input.kind]}** ${input.title}`];

  if (count > 1) lines.push(`${count} 件目。直近 ${WINDOW_SECONDS / 60} 分で同じ事象が続いています`);
  if (input.detail) lines.push(`\`\`\`${input.detail.slice(0, 500)}\`\`\``);

  if (input.context) {
    const pairs = Object.entries(input.context).map(([k, v]) => `${k}=${v}`);
    if (pairs.length > 0) lines.push(pairs.join(' '));
  }

  const stack = input.cause instanceof Error ? input.cause.stack : undefined;
  if (stack) {
    const frames = stack.split('\n').slice(0, 6).join('\n');
    lines.push(`\`\`\`${frames.slice(0, 800)}\`\`\``);
  }

  return lines.join('\n');
}

/**
 * 異常をDiscordへ通知する。呼び出し元の処理を止めないよう、失敗しても決して例外を投げない。
 * DISCORD_WEBHOOK_URL が未設定なら何もしないため、開発環境では自動的に無効になる。
 * 同じ kind と title と detail の組は 10 分の窓でまとめ、1・10・100 件目だけ送る。
 * 使われ方: 人が今すぐ動く必要がある事象にだけ使う前提。業務エラーやレート制限の発動には使わない。
 */
export async function notifyError(input: NotifyInput): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;

  try {
    const count = await countOccurrence(fingerprint(input));
    if (!shouldSend(count)) return;

    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: buildMessage(input, count).slice(0, 1900) }),
    });
  } catch (cause) {
    // 通知の失敗でリクエストを壊さない。ここで throw すると障害が二重になる
    console.error('通知の送信に失敗しました:', cause);
  }
}
