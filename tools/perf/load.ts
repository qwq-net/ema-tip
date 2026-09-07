import * as dotenv from 'dotenv';
import Redis from 'ioredis';
import { existsSync, readFileSync } from 'node:fs';
import postgres from 'postgres';

/**
 * 稼働中のアプリへ HTTP で負荷をかけて応答時間を計測する。
 * Server Action は Next-Action ヘッダで直接呼ぶため、.next の manifest が読める
 * app コンテナ内での実行が前提。task perf:setup 済みであること。
 *
 * 実行: task perf:load -- <シナリオ...>
 *   login  全ユーザー同時ログイン。bcrypt 照合の CPU 直列化の影響を単独実行と比べる
 *   bets   全ユーザー同時の馬券購入バースト。PERF_ROUNDS 回繰り返す
 *   bulk   一人による三連単全4,896点の一括購入。1リクエストの書き込み最悪ケース
 *   peak   SSE 接続とページ閲覧とベットが重なる開催ピークの複合負荷
 *   sse    全ユーザー接続中に締切イベントを発火し、SSE 到達遅延を測る。終了後は再開して戻す
 *   pages  主要ページの応答時間を直列計測する
 *   payout 締切→着順確定→払戻確定の所要時間を測る。レースが FINALIZED になるため最後に実行する
 *   standby 全員が結果待機画面を開いた状態で締切→着順確定→払戻確定を行う。締切直後の一斉表示と、
 *          RACE_BROADCAST を受けた各ブラウザが投げる再描画と払戻結果取得の一斉要求を測る。payout を含む
 *   bot    無認証のBOTアクセス。トップ・404・保護ルート・ログイン失敗を10並列で混合実行
 *   all    上記を login → bets → bulk → peak → sse → pages → bot → standby の順で実行する
 *
 * 応答時間の計測に加えて結果の正しさも検証する。購入シナリオは成功件数から期待支出を積み上げ、
 * 末尾で各ウォレットの残高とベット件数を DB と照合する。payout は HIT / LOST の内訳と払戻込みの残高を照合する。
 * いずれかの検証が失敗するかシナリオにエラーがあれば終了コード 1 で終わる
 */

dotenv.config();

const BASE = process.env.PERF_BASE_URL ?? 'http://localhost:3000';
const PASSWORD = '🐶🐶🐶';
const ROUNDS = Number(process.env.PERF_ROUNDS ?? 3);
const PAGE_ITERATIONS = Number(process.env.PERF_PAGE_ITERATIONS ?? 10);
const ADMIN_NAME = 'PERF管理者';

// baseline は実行開始時点のウォレット状態。検証は開始時点からの差分で行うため、
// 直前に perf:setup をやり直していなくても前回の残りに惑わされない
type WalletBaseline = { balance: number; betCount: number; payout: number };

type Fixture = {
  raceId: string;
  eventId: string;
  users: { name: string; walletId: string }[];
  entryIds: string[];
  baseline: Map<string, WalletBaseline>;
};

type ActionIds = {
  placeBets: string;
  closeRace: string;
  reopenRace: string;
  finalizeRace: string;
  finalizePayout: string;
  getPayoutResults: string;
};

type CallResult = { ms: number; ok: boolean; status: number; body: string };

// 成功した購入から積み上げる期待値。verifyLedger が DB と照合する
const expected = { spend: new Map<string, number>(), bets: new Map<string, number>() };
// エラー応答・検証不一致・SSE 未到達の数。0 でなければ終了コード 1
let failures = 0;

function recordPurchase(walletId: string, betCount: number, amountPerBet: number) {
  expected.spend.set(walletId, (expected.spend.get(walletId) ?? 0) + betCount * amountPerBet);
  expected.bets.set(walletId, (expected.bets.get(walletId) ?? 0) + betCount);
}

// 本番モードの proxy.ts は Secure Cookie 名でトークンを読むため、http 直アクセスでも
// https 経由と同じ Cookie 名になるよう全リクエストでプロトコルを偽装する
const PROTO_HEADER = { 'x-forwarded-proto': 'https' } as const;

// Server Action の呼び出しに使う ID を manifest から引く。
// dev サーバーは .next/dev 側へ書き、.next/server 側は過去の本番ビルドの残骸でありうるため
// dev 側を優先する。ID はビルドごとに変わるため実行時に解決する。見つからなければ throw
function loadActionId(filename: string, exportedName: string): string {
  // dev サーバー稼働中のコンテナで本番ビルド側を計測する場合は PERF_MANIFEST でパスを指定する
  const candidates = process.env.PERF_MANIFEST
    ? [process.env.PERF_MANIFEST]
    : ['.next/dev/server/server-reference-manifest.json', '.next/server/server-reference-manifest.json'];
  const path = candidates.find((p) => existsSync(p));
  if (!path) throw new Error('server-reference-manifest.json がありません。アプリの起動を確認してください');
  const manifest: { node: Record<string, { filename: string; exportedName: string }> } = JSON.parse(
    readFileSync(path, 'utf8')
  );
  for (const [id, entry] of Object.entries(manifest.node)) {
    if (entry.filename === filename && entry.exportedName === exportedName) return id;
  }
  throw new Error(`Server Action が manifest にありません: ${filename} ${exportedName}`);
}

// credentials ログインを行い、以後のリクエストに付ける Cookie ヘッダ値を返す。
// 認証失敗時はセッション Cookie が発行されないため throw する
async function login(username: string): Promise<string> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: PROTO_HEADER });
  const { csrfToken }: { csrfToken: string } = await csrfRes.json();
  const csrfCookies = csrfRes.headers.getSetCookie().map((c) => c.split(';')[0]);

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: csrfCookies.join('; '),
      Origin: BASE,
      ...PROTO_HEADER,
    },
    body: new URLSearchParams({ csrfToken, username, password: PASSWORD }),
  });
  const setCookies = res.headers.getSetCookie().map((c) => c.split(';')[0]);
  const session = setCookies.find((c) => c.includes('session-token'));
  if (!session) throw new Error(`ログイン失敗: ${username} status=${res.status}`);
  return [...csrfCookies, ...setCookies].join('; ');
}

// bcrypt 照合の負荷を計測対象のバーストへ混ぜないよう、ログインは直列で済ませておく
async function loginAll(names: string[]): Promise<Map<string, string>> {
  const cookies = new Map<string, string>();
  for (const name of names) {
    cookies.set(name, await login(name));
  }
  return cookies;
}

// Server Action を HTTP で直接呼ぶ。ok は HTTP 200 かつ応答に success:true を含むかで判定する。
// 応答は RSC ストリーム形式のため構造解析はせず、失敗調査用に本文をそのまま返す
async function callAction(cookie: string, path: string, actionId: string, args: unknown[]): Promise<CallResult> {
  const start = performance.now();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Next-Action': actionId,
      'Content-Type': 'text/plain;charset=UTF-8',
      Cookie: cookie,
      Origin: BASE,
      ...PROTO_HEADER,
    },
    body: JSON.stringify(args),
  });
  const body = await res.text();
  const ms = performance.now() - start;
  return { ms, ok: res.status === 200 && body.includes('"success":true'), status: res.status, body };
}

// p50/p95 は昇順ソート後の最近傍順位法で取る
function summarize(label: string, durations: number[], errors: number) {
  const sorted = [...durations].sort((a, b) => a - b);
  const pick = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))] ?? 0;
  const mean = sorted.length === 0 ? 0 : sorted.reduce((a, b) => a + b, 0) / sorted.length;
  if (errors > 0) failures++;
  console.log(
    `${label}: n=${sorted.length} errors=${errors} mean=${mean.toFixed(0)}ms p50=${pick(50).toFixed(0)}ms p95=${pick(95).toFixed(0)}ms max=${(sorted.at(-1) ?? 0).toFixed(0)}ms`
  );
}

let errorShown = false;
function reportError(r: CallResult) {
  if (errorShown) return;
  errorShown = true;
  console.error(`  最初のエラー応答: status=${r.status} body=${r.body.slice(0, 300)}`);
}

async function loadFixture(): Promise<Fixture> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const [race] = await sql`SELECT id, event_id FROM race_instance WHERE name = 'PERF検証レース' LIMIT 1`;
    if (!race) throw new Error('フィクスチャがありません。task perf:setup を先に実行してください');
    const users = await sql`
      SELECT u.name, w.id AS wallet_id
      FROM "user" u JOIN wallet w ON w.user_id = u.id AND w.event_id = ${race.event_id}
      WHERE u.name LIKE 'PERF利用者%' ORDER BY u.name
    `;
    const entries = await sql`SELECT id FROM race_entry WHERE race_id = ${race.id} ORDER BY horse_number`;
    const walletIds = users.map((u) => u.wallet_id);
    const baseline = new Map<string, WalletBaseline>();
    for (const row of await readWallets(sql, race.id, walletIds)) {
      baseline.set(row.walletId, row);
    }
    return {
      raceId: race.id,
      eventId: race.event_id,
      users: users.map((u) => ({ name: u.name, walletId: u.wallet_id })),
      entryIds: entries.map((e) => e.id),
      baseline,
    };
  } finally {
    await sql.end();
  }
}

// 対象レースに関する各ウォレットの残高・ベット件数・払戻合計を読む
async function readWallets(sql: postgres.Sql, raceId: string, walletIds: string[]) {
  const rows = await sql`
    SELECT w.id AS wallet_id, w.balance,
      count(b.id)::int AS bet_count,
      coalesce(sum(b.payout), 0) AS payout
    FROM wallet w
    LEFT JOIN bet b ON b.wallet_id = w.id AND b.race_id = ${raceId}
    WHERE w.id = ANY(${walletIds}::uuid[])
    GROUP BY w.id, w.balance
  `;
  return rows.map((r) => ({
    walletId: String(r.wallet_id),
    balance: Number(r.balance),
    betCount: Number(r.bet_count),
    payout: Number(r.payout),
  }));
}

// 各ウォレットの残高とベット件数を開始時点からの差分で照合する。
// 残高の減りは成功した購入の合計と一致し、増えた分は払戻の合計と一致しなければならない。
// 応答が success でも台帳が動いていない、あるいは失敗応答なのに引き落とされている、といった
// 複数プロセスで最も怖い不整合をここで捕まえる
async function verifyLedger(fx: Fixture, label: string) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const rows = await readWallets(
      sql,
      fx.raceId,
      fx.users.map((u) => u.walletId)
    );
    let mismatches = 0;
    for (const row of rows) {
      const base = fx.baseline.get(row.walletId);
      if (!base) continue;
      const wantBalance = base.balance - (expected.spend.get(row.walletId) ?? 0) + (row.payout - base.payout);
      const wantBets = base.betCount + (expected.bets.get(row.walletId) ?? 0);
      if (row.balance !== wantBalance || row.betCount !== wantBets) {
        mismatches++;
        if (mismatches <= 3) {
          console.error(
            `  台帳不一致 wallet=${row.walletId} balance=${row.balance} 期待=${wantBalance} bets=${row.betCount} 期待=${wantBets}`
          );
        }
      }
    }
    if (mismatches > 0) failures++;
    console.log(`  ${label} 台帳照合: ${rows.length} ウォレット中 不一致 ${mismatches}`);
  } finally {
    await sql.end();
  }
}

// 払戻確定後の的中判定を検証する。着順は馬番順で確定させるため、馬番 1 の単勝は全て HIT で
// payout が正、それ以外の単勝は全て LOST で payout 0 になる。PENDING が残っていれば払戻漏れ
async function verifyPayout(fx: Fixture) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const [row] = await sql`
      SELECT
        count(*) FILTER (
          WHERE details->>'type' = 'win' AND details->'selections' = '[1]'::jsonb
            AND NOT (status = 'HIT' AND coalesce(payout, 0) > 0)
        )::int AS bad_hit,
        count(*) FILTER (
          WHERE details->>'type' = 'win' AND details->'selections' <> '[1]'::jsonb
            AND NOT (status = 'LOST' AND coalesce(payout, 0) = 0)
        )::int AS bad_lost,
        count(*) FILTER (WHERE status = 'PENDING')::int AS pending,
        count(*)::int AS total
      FROM bet WHERE race_id = ${fx.raceId}
    `;
    const bad = Number(row?.bad_hit) + Number(row?.bad_lost) + Number(row?.pending);
    if (bad > 0) failures++;
    console.log(
      `  払戻照合: ${row?.total} 件中 的中誤り ${row?.bad_hit} 外れ誤り ${row?.bad_lost} 未確定 ${row?.pending}`
    );
  } finally {
    await sql.end();
  }
}

// 認証付き GET の所要時間を測る。リダイレクトは追従するが、飛ばされた時点で ok=false にする。
// セッション切れで /login へ落ちても最終応答は 200 なので、status だけでは認証の破れを見逃す
async function timedGet(cookie: string, path: string): Promise<{ ms: number; ok: boolean }> {
  const start = performance.now();
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie, ...PROTO_HEADER } });
  await res.text();
  return { ms: performance.now() - start, ok: res.status === 200 && !res.redirected };
}

// イベント開始時の一斉ログインを再現する。bcrypt 照合が Node の単一スレッドを占有するため、
// 単独実行との差で直列化による伸びを見る
async function scenarioLogin(fx: Fixture) {
  const solo = performance.now();
  await login(fx.users[0].name);
  console.log(`  単独ログイン: ${(performance.now() - solo).toFixed(0)}ms`);

  let errors = 0;
  const durations = await Promise.all(
    fx.users.map(async (u) => {
      const start = performance.now();
      try {
        await login(u.name);
      } catch {
        errors++;
      }
      return performance.now() - start;
    })
  );
  summarize('login 30人同時', durations, errors);
}

// 開催ピークの複合負荷。全員が SSE を張り、レースページを見てはベットする流れを同時に行う。
// 単独シナリオでは見えない相互干渉込みの応答時間と、オッズ更新イベントの到達を確認する
async function scenarioPeak(fx: Fixture, ids: ActionIds) {
  const cookies = await loginAll(fx.users.map((u) => u.name));
  const ac = new AbortController();
  const subs = fx.users.map((u) => subscribe(cookies.get(u.name) ?? '', 'RACE_ODDS_UPDATED', ac.signal));
  await Promise.all(subs.map((s) => s.ready));
  console.log(`  ${subs.length} 接続確立`);

  const combinations = Array.from({ length: 8 }, (_, i) => [i + 1]);
  const betDurations: number[] = [];
  const pageDurations: number[] = [];
  let betErrors = 0;
  let pageErrors = 0;

  for (let round = 1; round <= ROUNDS; round++) {
    await Promise.all(
      fx.users.map(async (u) => {
        const cookie = cookies.get(u.name) ?? '';
        const before = await timedGet(cookie, `/races/${fx.raceId}`);
        const bet = await callAction(cookie, `/races/${fx.raceId}`, ids.placeBets, [
          { raceId: fx.raceId, walletId: u.walletId, betType: 'win', combinations, amountPerBet: 100 },
        ]);
        const after = await timedGet(cookie, `/races/${fx.raceId}`);
        for (const page of [before, after]) {
          pageDurations.push(page.ms);
          if (!page.ok) pageErrors++;
        }
        betDurations.push(bet.ms);
        if (bet.ok) {
          recordPurchase(u.walletId, combinations.length, 100);
        } else {
          betErrors++;
          reportError(bet);
        }
      })
    );
  }

  summarize('peak bets', betDurations, betErrors);
  summarize('peak pages', pageDurations, pageErrors);

  const oddsArrivals = await Promise.all(subs.map((s) => withTimeout(s.arrival)));
  const arrived = oddsArrivals.filter((a) => a !== null);
  // Redis を往復した payload が壊れていないことも見る。到達しても中身が無ければ画面は更新されない
  const withOdds = arrived.filter((a) => a.chunk.includes('"winOdds":{'));
  if (withOdds.length < subs.length) failures++;
  console.log(`  オッズSSE到達: ${arrived.length}/${subs.length} 接続、winOdds 付き ${withOdds.length}`);
  ac.abort();
  await verifyLedger(fx, 'peak');
}

// 締切直前の一斉購入を再現する。全ユーザーが単勝8点を同時に投げるラウンドを ROUNDS 回実施
async function scenarioBets(fx: Fixture, ids: ActionIds) {
  const cookies = await loginAll(fx.users.map((u) => u.name));
  const combinations = Array.from({ length: 8 }, (_, i) => [i + 1]);
  const durations: number[] = [];
  let errors = 0;

  for (let round = 1; round <= ROUNDS; round++) {
    const wall = performance.now();
    const results = await Promise.all(
      fx.users.map((u) =>
        callAction(cookies.get(u.name) ?? '', `/races/${fx.raceId}`, ids.placeBets, [
          { raceId: fx.raceId, walletId: u.walletId, betType: 'win', combinations, amountPerBet: 100 },
        ])
      )
    );
    results.forEach((r, i) => {
      durations.push(r.ms);
      if (r.ok) {
        recordPurchase(fx.users[i]?.walletId ?? '', combinations.length, 100);
      } else {
        errors++;
        reportError(r);
      }
    });
    console.log(`  round ${round}/${ROUNDS}: wall=${(performance.now() - wall).toFixed(0)}ms`);
  }
  summarize('bets', durations, errors);
  await verifyLedger(fx, 'bets');
}

// 一人が行える1リクエストの最悪ケースを測る。18頭立て三連単の全4,896点を一括購入し、
// bet と transaction 各4,896行の書き込みを1回のリクエストで発生させる。
// 総額約49万円を要するため、bets シナリオとは別ユーザーを使う
async function scenarioBulk(fx: Fixture, ids: ActionIds) {
  const user = fx.users.at(-1);
  if (!user) throw new Error('ユーザーがいません');
  const cookie = await login(user.name);

  const combinations: number[][] = [];
  const n = fx.entryIds.length;
  for (let a = 1; a <= n; a++) {
    for (let b = 1; b <= n; b++) {
      for (let c = 1; c <= n; c++) {
        if (a !== b && b !== c && a !== c) combinations.push([a, b, c]);
      }
    }
  }

  const r = await callAction(cookie, `/races/${fx.raceId}`, ids.placeBets, [
    { raceId: fx.raceId, walletId: user.walletId, betType: 'trifecta', combinations, amountPerBet: 100 },
  ]);
  console.log(`  三連単${combinations.length}点一括購入: ${r.ms.toFixed(0)}ms ok=${r.ok}`);
  if (r.ok) {
    recordPurchase(user.walletId, combinations.length, 100);
  } else {
    failures++;
    reportError(r);
  }
  await verifyLedger(fx, 'bulk');
}

type Arrival = { at: number; chunk: string };

// 10 秒以内に解決しなければ null。SSE の到達待ちに使う
function withTimeout<T>(p: Promise<T>): Promise<T | null> {
  return Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000))]);
}

// SSE を1本購読し、初回応答で ready、指定イベント到達時に時刻と本文で arrival が解決する。
// arrival はイベントが来なければ解決しないため、呼び手が withTimeout を併用する
function subscribe(
  cookie: string,
  matchType: string,
  signal: AbortSignal
): { ready: Promise<void>; arrival: Promise<Arrival> } {
  let readyResolve = () => {};
  let arrivalResolve = (_: Arrival) => {};
  const ready = new Promise<void>((resolve) => {
    readyResolve = resolve;
  });
  const arrival = new Promise<Arrival>((resolve) => {
    arrivalResolve = resolve;
  });

  (async () => {
    const res = await fetch(`${BASE}/api/events/race-status`, {
      headers: { Cookie: cookie, Accept: 'text/event-stream', ...PROTO_HEADER },
      signal,
    });
    if (!res.ok || !res.body) throw new Error(`SSE 接続失敗: status=${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx = buf.indexOf('\n\n');
      while (idx >= 0) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        if (chunk.includes('"type":"connected"')) readyResolve();
        if (chunk.includes(`"type":"${matchType}"`)) arrivalResolve({ at: performance.now(), chunk });
        idx = buf.indexOf('\n\n');
      }
    }
  })().catch((e) => {
    if (!signal.aborted) console.error(`  SSE エラー: ${e}`);
  });

  return { ready, arrival };
}

// race-events チャンネルを購読している app プロセスの数を出す。
// app を複数プロセスで動かす構成では、SSE 接続が全プロセスへ散っていれば台数と一致する
async function reportSubscriberProcesses() {
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  try {
    await redis.connect();
    const result = await redis.pubsub('NUMSUB', 'race-events');
    console.log(`  購読プロセス数: ${String(result[1])}`);
  } catch (e) {
    console.error(`  購読プロセス数の取得に失敗: ${e}`);
  } finally {
    redis.disconnect();
  }
}

// 全ユーザーが SSE 接続中に管理者が締切を発火し、全接続への到達遅延を測る。
// 終了後は reopenRace で SCHEDULED へ戻すため後続シナリオへ影響しない
async function scenarioSse(fx: Fixture, ids: ActionIds) {
  const cookies = await loginAll(fx.users.map((u) => u.name));
  const adminCookie = await login(ADMIN_NAME);
  const ac = new AbortController();

  const subs = fx.users.map((u) => subscribe(cookies.get(u.name) ?? '', 'RACE_CLOSED', ac.signal));
  await Promise.all(subs.map((s) => s.ready));
  console.log(`  ${subs.length} 接続確立`);
  await reportSubscriberProcesses();

  const t0 = performance.now();
  const close = await callAction(adminCookie, `/admin/races/${fx.raceId}`, ids.closeRace, [fx.raceId]);
  if (!close.ok) {
    reportError(close);
    ac.abort();
    throw new Error('closeRace が失敗したため SSE 計測を中止します');
  }

  const arrivals = await Promise.all(subs.map((s) => withTimeout(s.arrival)));
  const latencies = arrivals.filter((a) => a !== null).map((a) => a.at - t0);
  summarize('sse RACE_CLOSED 到達', latencies, arrivals.filter((a) => a === null).length);

  const reopen = await callAction(adminCookie, `/admin/races/${fx.raceId}`, ids.reopenRace, [fx.raceId]);
  if (!reopen.ok) console.error('  reopenRace が失敗しました。レースが CLOSED のままです');
  ac.abort();
}

// 主要ページの応答時間を1ユーザーで直列計測する。各ページ初回はウォームアップとして捨てる。
// リダイレクトは実際の閲覧と同じく追従し、最終応答までを1回の所要時間とする
async function scenarioPages(fx: Fixture) {
  const cookie = await login(fx.users[0].name);
  // / はログイン済みなら /mypage へリダイレクトするだけなので対象にせず、即BET と戦績を測る
  const paths = ['/mypage/sokubet', `/races/${fx.raceId}`, `/ranking/${fx.eventId}`, '/mypage/stats', '/mypage'];

  for (const path of paths) {
    await fetch(`${BASE}${path}`, { headers: { Cookie: cookie, ...PROTO_HEADER } }).then((r) => r.text());
    const durations: number[] = [];
    let errors = 0;
    for (let i = 0; i < PAGE_ITERATIONS; i++) {
      const start = performance.now();
      const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie, ...PROTO_HEADER } });
      await res.text();
      durations.push(performance.now() - start);
      if (res.status !== 200 || res.redirected) errors++;
    }
    summarize(`pages ${path}`, durations, errors);
  }
}

// 無認証の BOT アクセスを再現する。未認証トップ・ログインページ・実在しないパス・
// 保護 API・パスワード誤りのログイン試行を混ぜ、匿名トラフィックの応答と副作用を測る。
// アプリは cf-connecting-ip だけを信頼するため、分散攻撃の再現もこのヘッダで IP を散らす。
// x-forwarded-for は意図的に無視される設計で、偽装してもレート制限は回避できない
async function scenarioBot() {
  const total = Number(process.env.PERF_BOT_REQUESTS ?? 400);
  const stats = new Map<string, { durations: number[]; errors: number; statuses: Map<number, number> }>();
  const track = (kind: string, ms: number, status: number, okStatuses: number[]) => {
    const s = stats.get(kind) ?? { durations: [], errors: 0, statuses: new Map<number, number>() };
    s.durations.push(ms);
    s.statuses.set(status, (s.statuses.get(status) ?? 0) + 1);
    if (!okStatuses.includes(status)) s.errors++;
    stats.set(kind, s);
  };
  const randIp = () =>
    `10.${1 + Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;

  const timedAnon = async (kind: string, path: string, okStatuses: number[]) => {
    const start = performance.now();
    const res = await fetch(`${BASE}${path}`, { headers: PROTO_HEADER });
    await res.text();
    track(kind, performance.now() - start, res.status, okStatuses);
  };

  const visit = async (i: number) => {
    const n = i % 10;
    if (n <= 3) await timedAnon('GET / 未認証', '/', [200]);
    else if (n <= 5) await timedAnon('GET /login', '/login', [200]);
    else if (n <= 7) await timedAnon('GET 実在しないパス', `/wp-admin-${i}`, [404]);
    else if (n === 8) await timedAnon('GET 保護API 未認証', '/api/events/race-status', [401]);
    else {
      const ip = randIp();
      const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { ...PROTO_HEADER, 'cf-connecting-ip': ip } });
      const { csrfToken }: { csrfToken: string } = await csrfRes.json();
      const cookies = csrfRes.headers.getSetCookie().map((c) => c.split(';')[0]);
      const start = performance.now();
      const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookies.join('; '),
          'cf-connecting-ip': ip,
          Origin: BASE,
          ...PROTO_HEADER,
        },
        body: new URLSearchParams({ csrfToken, username: 'PERF利用者01', password: '🐴🐴🐴' }),
      });
      await res.text();
      track('POST ログイン失敗', performance.now() - start, res.status, [302]);
    }
  };

  // 10並列のワーカーで total 件を消化する
  let next = 0;
  let aborted = 0;
  await Promise.all(
    Array.from({ length: 10 }, async () => {
      for (;;) {
        const i = next++;
        if (i >= total) break;
        try {
          await visit(i);
        } catch {
          aborted++;
        }
      }
    })
  );

  for (const [kind, s] of stats) {
    const statuses = [...s.statuses].map(([code, count]) => `${code}×${count}`).join(' ');
    summarize(`bot ${kind} [${statuses}]`, s.durations, s.errors);
  }
  if (aborted > 0) console.error(`  接続レベルの失敗: ${aborted}件`);
}

// 締切→着順確定→払戻確定を順に実行し、各所要時間を測る。
// 実行後レースは FINALIZED になるため、再計測は task perf:setup からやり直す
async function scenarioPayout(fx: Fixture, ids: ActionIds) {
  const adminCookie = await login(ADMIN_NAME);
  const path = `/admin/races/${fx.raceId}`;

  const close = await callAction(adminCookie, path, ids.closeRace, [fx.raceId]);
  console.log(`  closeRace: ${close.ms.toFixed(0)}ms ok=${close.ok}`);

  const results = fx.entryIds.map((entryId, i) => ({ entryId, finishPosition: i + 1 }));
  const finalize = await callAction(adminCookie, path, ids.finalizeRace, [fx.raceId, results]);
  console.log(`  finalizeRace: ${finalize.ms.toFixed(0)}ms ok=${finalize.ok}`);
  if (!finalize.ok) {
    failures++;
    reportError(finalize);
    return;
  }

  const payout = await callAction(adminCookie, path, ids.finalizePayout, [fx.raceId]);
  console.log(`  finalizePayout: ${payout.ms.toFixed(0)}ms ok=${payout.ok}`);
  if (!payout.ok) {
    failures++;
    reportError(payout);
    return;
  }
  await verifyPayout(fx);
  await verifyLedger(fx, 'payout');
}

// 結果待機画面に全員が揃った状態で払戻確定する。実際のブラウザは RACE_BROADCAST を受けると
// router.refresh による待機ページの再描画と、払戻結果を取る Server Action を同時に投げるため、
// 到達遅延に加えてその 2 本の一斉要求の応答時間とエラーを測る。
// 締切直後の一斉表示も測る。CLOSED の待機ページは暫定オッズを全ベット走査で作り、
// Redis キャッシュのミスが同時に重なると走査が人数分走るため、ここが最も重い瞬間になりうる。
// payout と同じくレースを FINALIZED にするので最後に実行する
async function scenarioStandby(fx: Fixture, ids: ActionIds) {
  const cookies = await loginAll(fx.users.map((u) => u.name));
  const adminCookie = await login(ADMIN_NAME);
  const adminPath = `/admin/races/${fx.raceId}`;
  const standbyPath = `/races/${fx.raceId}/standby`;

  const close = await callAction(adminCookie, adminPath, ids.closeRace, [fx.raceId]);
  console.log(`  closeRace: ${close.ms.toFixed(0)}ms ok=${close.ok}`);
  if (!close.ok) {
    failures++;
    reportError(close);
    return;
  }

  const firstViews = await Promise.all(fx.users.map((u) => timedGet(cookies.get(u.name) ?? '', standbyPath)));
  summarize(
    'standby 締切直後の一斉表示',
    firstViews.map((v) => v.ms),
    firstViews.filter((v) => !v.ok).length
  );

  const results = fx.entryIds.map((entryId, i) => ({ entryId, finishPosition: i + 1 }));
  const finalize = await callAction(adminCookie, adminPath, ids.finalizeRace, [fx.raceId, results]);
  console.log(`  finalizeRace: ${finalize.ms.toFixed(0)}ms ok=${finalize.ok}`);
  if (!finalize.ok) {
    failures++;
    reportError(finalize);
    return;
  }

  const ac = new AbortController();
  const subs = fx.users.map((u) => subscribe(cookies.get(u.name) ?? '', 'RACE_BROADCAST', ac.signal));
  await Promise.all(subs.map((s) => s.ready));
  console.log(`  ${subs.length} 接続確立`);

  // 到達した瞬間にブラウザと同じ 2 要求を投げる。getPayoutResults は配列を返すため成功判定は本文の形で行う
  const reactions = subs.map((s, i) => {
    const cookie = cookies.get(fx.users[i]?.name ?? '') ?? '';
    return withTimeout(s.arrival).then(async (arrival) => {
      if (!arrival) return null;
      const [page, action] = await Promise.all([
        timedGet(cookie, standbyPath),
        callAction(cookie, standbyPath, ids.getPayoutResults, [fx.raceId]),
      ]);
      const actionOk = action.status === 200 && action.body.includes('"combinations"');
      return { arrival, page, action: { ...action, ok: actionOk } };
    });
  });

  const t0 = performance.now();
  const payout = await callAction(adminCookie, adminPath, ids.finalizePayout, [fx.raceId]);
  console.log(`  finalizePayout: ${payout.ms.toFixed(0)}ms ok=${payout.ok}`);
  if (!payout.ok) {
    failures++;
    reportError(payout);
    ac.abort();
    return;
  }

  const settled = await Promise.all(reactions);
  ac.abort();
  const arrived = settled.filter((r) => r !== null);
  summarize(
    'standby RACE_BROADCAST 到達',
    arrived.map((r) => r.arrival.at - t0),
    settled.length - arrived.length
  );
  summarize(
    'standby 再描画',
    arrived.map((r) => r.page.ms),
    arrived.filter((r) => !r.page.ok).length
  );
  summarize(
    'standby 払戻結果取得',
    arrived.map((r) => r.action.ms),
    arrived.filter((r) => !r.action.ok).length
  );
  const firstBadAction = arrived.find((r) => !r.action.ok);
  if (firstBadAction) reportError(firstBadAction.action);

  await verifyPayout(fx);
  await verifyLedger(fx, 'standby');
}

async function main() {
  const requested = process.argv.slice(2);
  if (requested.length === 0) {
    console.log('使い方: task perf:load -- <login|bets|bulk|peak|sse|pages|bot|payout|standby|all>');
    process.exit(1);
  }
  const names = requested.includes('all')
    ? ['login', 'bets', 'bulk', 'peak', 'sse', 'pages', 'bot', 'standby']
    : requested;

  const fx = await loadFixture();

  // dev サーバーはページ初回アクセス時にコンパイルし、その時点で manifest のアクション ID が
  // 確定する。ID 解決より先に対象ページを踏んで manifest を最新化する
  const warmCookie = await login(fx.users[0].name);
  const adminWarmCookie = await login(ADMIN_NAME);
  await fetch(`${BASE}/races/${fx.raceId}`, { headers: { Cookie: warmCookie, ...PROTO_HEADER } }).then((r) => r.text());
  await fetch(`${BASE}/admin/races/${fx.raceId}`, { headers: { Cookie: adminWarmCookie, ...PROTO_HEADER } }).then((r) =>
    r.text()
  );

  const ids: ActionIds = {
    placeBets: loadActionId('src/features/betting/actions.ts', 'placeBets'),
    closeRace: loadActionId('src/features/admin/manage-races/actions/update.ts', 'closeRace'),
    reopenRace: loadActionId('src/features/admin/manage-races/actions/update.ts', 'reopenRace'),
    finalizeRace: loadActionId('src/features/admin/manage-races/actions/finalize.ts', 'finalizeRace'),
    finalizePayout: loadActionId('src/features/admin/manage-races/actions/payout.ts', 'finalizePayout'),
    getPayoutResults: loadActionId('src/entities/race/actions.ts', 'getPayoutResults'),
  };

  console.log(`target=${BASE} users=${fx.users.length} race=${fx.raceId}`);
  for (const name of names) {
    console.log(`── ${name}`);
    if (name === 'login') await scenarioLogin(fx);
    else if (name === 'bets') await scenarioBets(fx, ids);
    else if (name === 'bulk') await scenarioBulk(fx, ids);
    else if (name === 'peak') await scenarioPeak(fx, ids);
    else if (name === 'sse') await scenarioSse(fx, ids);
    else if (name === 'pages') await scenarioPages(fx);
    else if (name === 'bot') await scenarioBot();
    else if (name === 'payout') await scenarioPayout(fx, ids);
    else if (name === 'standby') await scenarioStandby(fx, ids);
    else {
      failures++;
      console.error(`不明なシナリオ: ${name}`);
    }
  }
  if (failures > 0) {
    console.error(`検証失敗またはエラーあり: ${failures} 件`);
    process.exit(1);
  }
  console.log('全シナリオの検証に成功しました');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
