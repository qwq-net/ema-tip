import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import postgres from 'postgres';

/**
 * 負荷計測用フィクスチャを作る。e2e/support/fixtures.ts と同じく raw SQL で完結させ、
 * PERF 接頭辞のデータを先に消してから作り直すため何度でも実行できる。
 * 前提: task db:seed 済みで venue と horse が存在すること。
 * 実行: task perf:setup
 */

dotenv.config();

const PERF = {
  adminName: 'PERF管理者',
  userPrefix: 'PERF利用者',
  userCount: Number(process.env.PERF_USERS ?? 30),
  eventName: 'PERF検証イベント',
  raceName: 'PERF検証レース',
  password: '🐶🐶🐶',
  // bets シナリオ消化後も bulk の三連単全4,896点×100円を買い切れる残高にしておく
  balance: 500_000,
  // 実戦のフルゲート想定。三連単4,896点となり、1リクエスト上限1000点の一括購入を検証できる
  horseCount: 18,
} as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const sql = postgres(url, { max: 1, prepare: false });

  try {
    await sql`DELETE FROM event WHERE name = ${PERF.eventName}`;
    await sql`DELETE FROM "user" WHERE name = ${PERF.adminName} OR name LIKE ${PERF.userPrefix + '%'}`;
    await sql`DELETE FROM horse WHERE name LIKE 'PERF馬%'`;

    const passwordHash = bcrypt.hashSync(PERF.password, 10);

    const [admin] = await sql`
      INSERT INTO "user" (id, name, role, password, is_onboarding_completed)
      VALUES (${crypto.randomUUID()}, ${PERF.adminName}, 'ADMIN', ${passwordHash}, true)
      RETURNING id
    `;

    const userNames = Array.from({ length: PERF.userCount }, (_, i) => `${PERF.userPrefix}${String(i + 1).padStart(2, '0')}`);
    const userIds: string[] = [];
    for (const name of userNames) {
      const [user] = await sql`
        INSERT INTO "user" (id, name, role, password, is_onboarding_completed)
        VALUES (${crypto.randomUUID()}, ${name}, 'USER', ${passwordHash}, true)
        RETURNING id
      `;
      userIds.push(user.id);
    }

    const [event] = await sql`
      INSERT INTO event (name, description, distribute_amount, status, date)
      VALUES (${PERF.eventName}, '負荷計測用', ${PERF.balance}, 'ACTIVE', CURRENT_DATE)
      RETURNING id
    `;

    // シード未投入の空 DB でも動くよう、競馬場がなければ計測用に1つ作る
    let [venue] = await sql`SELECT id FROM venue LIMIT 1`;
    if (!venue) {
      [venue] = await sql`
        INSERT INTO venue (name, short_name, default_direction) VALUES ('PERF競馬場', 'PERF', 'LEFT')
        RETURNING id
      `;
    }

    // シードの頭数が足りない分は計測用の馬で埋め、フルゲートを成立させる
    const horses = await sql`SELECT id FROM horse ORDER BY name LIMIT ${PERF.horseCount}`;
    for (let i = horses.length; i < PERF.horseCount; i++) {
      const [horse] = await sql`
        INSERT INTO horse (name, gender) VALUES (${`PERF馬${String(i + 1).padStart(2, '0')}`}, 'HORSE')
        RETURNING id
      `;
      horses.push(horse);
    }

    // guaranteed_odds を固定して払戻計算を決定的にする
    const [race] = await sql`
      INSERT INTO race_instance (event_id, venue_id, date, name, race_number, distance, surface, status, guaranteed_odds)
      VALUES (${event.id}, ${venue.id}, CURRENT_DATE, ${PERF.raceName}, 1, 1600, '芝', 'SCHEDULED', ${sql.json({ win: 2 })})
      RETURNING id
    `;

    for (let i = 0; i < horses.length; i++) {
      await sql`
        INSERT INTO race_entry (race_id, horse_id, bracket_number, horse_number)
        VALUES (${race.id}, ${horses[i].id}, ${Math.min(i + 1, 8)}, ${i + 1})
      `;
    }

    // 初期残高には DISTRIBUTION 取引を対で入れ、負荷試験後も db:reconcile が通る状態を保つ
    // PERF_HISTORY で過去開催の蓄積を再現する。全ユーザーが単勝8点を買って外れた
    // 確定済みレースをその件数分作る。外れ分は DISTRIBUTION へ上乗せして台帳整合を保つ
    const historyRaces = Number(process.env.PERF_HISTORY ?? 0);
    const historySpendPerUser = historyRaces * 800;

    const userWallets: { id: string; userId: string }[] = [];
    for (const userId of userIds) {
      const [wallet] = await sql`
        INSERT INTO wallet (user_id, event_id, balance)
        VALUES (${userId}, ${event.id}, ${PERF.balance})
        RETURNING id
      `;
      await sql`
        INSERT INTO transaction (wallet_id, type, amount)
        VALUES (${wallet.id}, 'DISTRIBUTION', ${PERF.balance + historySpendPerUser})
      `;
      userWallets.push({ id: wallet.id, userId });
    }

    for (let r = 0; r < historyRaces; r++) {
      const [pastRace] = await sql`
        INSERT INTO race_instance (event_id, venue_id, date, name, race_number, distance, surface, status, guaranteed_odds)
        VALUES (${event.id}, ${venue.id}, CURRENT_DATE - ${r + 1}::int, ${`PERF過去レース${String(r + 1).padStart(2, '0')}`}, ${r + 2}, 1600, '芝', 'FINALIZED', ${sql.json({ win: 2 })})
        RETURNING id
      `;
      await sql`INSERT INTO race_entry ${sql(
        horses.map((h, i) => ({
          race_id: pastRace.id,
          horse_id: h.id,
          bracket_number: Math.min(i + 1, 8),
          horse_number: i + 1,
          finish_position: i + 1,
        }))
      )}`;
      // enum と jsonb はバルク挿入ヘルパーが text で送って型不一致になるため、unnest とキャストで入れる
      const groups = userWallets.map((w) => ({ id: crypto.randomUUID(), userId: w.userId, walletId: w.id }));
      await sql`
        INSERT INTO bet_group (id, user_id, race_id, wallet_id, type, total_amount)
        SELECT g.id, g.user_id, ${pastRace.id}::uuid, g.wallet_id, 'win'::bet_type, 800
        FROM unnest(${groups.map((g) => g.id)}::uuid[], ${groups.map((g) => g.userId)}::text[], ${groups.map((g) => g.walletId)}::uuid[])
          AS g(id, user_id, wallet_id)
      `;
      const betRows = groups.flatMap((g) =>
        Array.from({ length: 8 }, (_, i) => ({ ...g, details: JSON.stringify({ type: 'win', selections: [i + 1] }) }))
      );
      await sql`
        INSERT INTO bet (user_id, race_id, wallet_id, bet_group_id, details, amount, status)
        SELECT b.user_id, ${pastRace.id}::uuid, b.wallet_id, b.group_id, b.details, 100, 'LOST'::bet_status
        FROM unnest(${betRows.map((b) => b.userId)}::text[], ${betRows.map((b) => b.walletId)}::uuid[], ${betRows.map((b) => b.id)}::uuid[], ${betRows.map((b) => b.details)}::jsonb[])
          AS b(user_id, wallet_id, group_id, details)
      `;
      await sql`
        INSERT INTO transaction (wallet_id, type, amount)
        SELECT t.wallet_id, 'BET'::transaction_type, -100
        FROM unnest(${betRows.map((b) => b.walletId)}::uuid[]) AS t(wallet_id)
      `;
    }

    console.log(JSON.stringify({ raceId: race.id, eventId: event.id, users: userNames.length, historyRaces }));
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
