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

// 抑制の照会を諦めるまでの時間。ioredis は接続断のときコマンドを待たせ、実測で 19 秒返らなかった。
// Redis 断を知らせる通知がその分遅れるのは本末転倒なので、短く切ってプロセス内の数え上げへ落とす
const DEDUP_TIMEOUT_MS = 1000;

// Redis が使えないときの数え上げ。基盤の異常そのものを通知する経路なので、
// Redis に依存しきると肝心なときに通知が出せなくなる
const localCounts = new Map<string, { count: number; expiresAt: number }>();

/** 期限切れの数え上げを捨てる。指紋は例外メッセージ由来で種類が増えるため、放置すると際限なく溜まる。 */
function pruneLocalCounts(now: number): void {
  for (const [key, value] of localCounts) {
    if (value.expiresAt <= now) localCounts.delete(key);
  }
}

/** 制限時間を超えたら reject する。Redis の応答待ちを短く切るために使う。 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('抑制の照会が制限時間を超えました')), ms).unref();
    }),
  ]);
}

/** テスト用に抑制の状態を捨てる。本番のコードから呼ばないこと。 */
export function resetNotifyStateForTest(): void {
  localCounts.clear();
}

/**
 * 抑制の鍵に使う文字列ハッシュ。暗号強度は不要で、異なる事象が同じ鍵へ落ちないことだけが要る。
 * node:crypto を使うと instrumentation 経由で Edge 向けの束にも取り込まれ、ビルドが警告を出す。
 * 実行環境を選ばない純粋な実装にする。異なる定数で 2 本回して 64 ビット分の幅を取る。
 */
function hashText(text: string): string {
  let low = 0x811c9dc5;
  let high = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    low = Math.imul(low ^ code, 0x01000193);
    high = Math.imul(high ^ code, 0x85ebca6b);
  }
  return (low >>> 0).toString(16).padStart(8, '0') + (high >>> 0).toString(16).padStart(8, '0');
}

function fingerprint({ kind, title, detail }: NotifyInput): string {
  return hashText(`${kind}\n${title}\n${(detail ?? '').slice(0, 200)}`);
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
    const count = await withTimeout(redis.incr(`notify:${key}`), DEDUP_TIMEOUT_MS);
    // NX 付きで毎回発行する。1 件目だけに絞ると、制限時間で諦めた裏で INCR が成立したときに
    // 期限の無いキーが残り、窓が二度と切れず 10 件目まで鳴らなくなる。NX なので窓は延びない
    void redis.expire(`notify:${key}`, WINDOW_SECONDS, 'NX').catch(() => undefined);
    return count;
  } catch {
    const now = Date.now();
    pruneLocalCounts(now);
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

// 通知を読むのは日本にいる運営なので、表示は日本時間に固定する。日本は夏時間を持たないため定数でよい
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 末尾の区切り。Discord は連続した投稿を詰めて並べるため、無いと直前のログと地続きに見える
const SEPARATOR = '-----';

// Discord の 1 投稿の上限は 2000 文字。区切りを必ず残すため、本文はその手前で切る
const CONTENT_LIMIT = 2000;

/** 日本時間の `YYYY-MM-DD HH:MM:SS.mmm` を返す。秒より細かい桁は、連続した事象の間隔を読むために残す。 */
function formatTimestamp(at: Date): string {
  const jst = new Date(at.getTime() + JST_OFFSET_MS);
  const pad = (value: number, width = 2) => String(value).padStart(width, '0');
  const date = `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}`;
  const time = `${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:${pad(jst.getUTCSeconds())}`;
  return `${date} ${time}.${pad(jst.getUTCMilliseconds(), 3)}`;
}

/**
 * 日時・要約・詳細の 3 段で組み立てる。
 * 要約は引用にして視線が最初に落ちる位置を作り、機械的な文字列はコードブロックへ隔離する。
 * 件数と文脈は要約と同じ引用へ続け、読む対象を 2 箇所に散らさない。
 */
function buildMessage(input: NotifyInput, count: number): string {
  const quoted = [`${KIND_LABELS[input.kind]} ${input.title}`];
  if (count > 1) quoted.push(`${count} 件目。直近 ${WINDOW_SECONDS / 60} 分で同じ事象が続いています`);
  if (input.context) {
    const pairs = Object.entries(input.context).map(([key, value]) => `${key}=${value}`);
    if (pairs.length > 0) quoted.push(pairs.join(' '));
  }

  const blocks = [formatTimestamp(new Date()), '', quoted.map((line) => `> ${line}`).join('\n')];

  const details: string[] = [];
  if (input.detail) details.push(input.detail.slice(0, 500));
  const stack = input.cause instanceof Error ? input.cause.stack : undefined;
  if (stack) details.push(stack.split('\n').slice(0, 6).join('\n').slice(0, 800));

  if (details.length > 0) blocks.push('', `\`\`\`\n${details.join('\n\n')}\n\`\`\``);

  // 切り詰めは区切りを足す前に行う。後から足すと、長い本文のときだけ区切りが消える
  const body = blocks.join('\n').slice(0, CONTENT_LIMIT - SEPARATOR.length - 1);
  return `${body}\n${SEPARATOR}`;
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
      body: JSON.stringify({ content: buildMessage(input, count) }),
    });
  } catch (cause) {
    // 通知の失敗でリクエストを壊さない。ここで throw すると障害が二重になる
    console.error('通知の送信に失敗しました:', cause);
  }
}
