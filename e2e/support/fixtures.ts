import bcrypt from 'bcryptjs';
import postgres from 'postgres';

/**
 * E2E 専用のフィクスチャ一式。アプリの schema を import せず raw SQL で完結させ、
 * アプリ側のビルド設定に依存しない独立したテストデータ管理にしている。
 * 名前は固定で、setup 時に前回の残骸を先に掃除するため再実行しても衝突しない。
 */

export const E2E = {
  adminName: 'E2E管理者',
  guestName: 'E2Eゲスト太郎',
  guestCode: 'E2ECODE',
  eventName: 'E2E検証イベント',
  raceName: 'E2E検証レース',
  // 絵文字キーパッドで入力できる3文字。signup と admin ログインの両方で使う
  password: '🐶🐶🐶',
  distributeAmount: 10000,
  betAmount: 100,
  // guaranteedOdds win 2.0 固定なので、的中payoutは 100円 × 2.0 = 200円 で決定的になる
  expectedPayout: 200,
} as const;

function createSql() {
  const url = process.env.E2E_DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/webapp';
  return postgres(url, { max: 1, prepare: false });
}

export type Fixtures = {
  raceId: string;
  eventId: string;
  horse1Name: string;
};

// 管理者・ゲストコード・ACTIVEイベント・SCHEDULEDレース・出走馬5頭を作って ID を返す。
// 出走馬はシード済みの horse を先頭から流用し、馬番1の馬が「1着候補」チェックの対象になる
export async function setupFixtures(): Promise<Fixtures> {
  const sql = createSql();
  try {
    await cleanupWith(sql);

    const passwordHash = bcrypt.hashSync(E2E.password, 10);
    const [admin] = await sql`
      INSERT INTO "user" (id, name, role, password, is_onboarding_completed)
      VALUES (${crypto.randomUUID()}, ${E2E.adminName}, 'ADMIN', ${passwordHash}, true)
      RETURNING id
    `;

    await sql`
      INSERT INTO guest_code (code, title, created_by)
      VALUES (${E2E.guestCode}, 'E2E用コード', ${admin.id})
    `;

    const [event] = await sql`
      INSERT INTO event (name, description, distribute_amount, status, date)
      VALUES (${E2E.eventName}, 'E2E自動テスト用', ${E2E.distributeAmount}, 'ACTIVE', CURRENT_DATE)
      RETURNING id
    `;

    const [venue] = await sql`SELECT id FROM venue LIMIT 1`;
    if (!venue) throw new Error('venue がありません。task db:seed を先に実行してください');

    const horses = await sql`SELECT id, name FROM horse ORDER BY name LIMIT 5`;
    if (horses.length < 5) throw new Error('horse が5頭未満です。task db:seed を先に実行してください');

    const [race] = await sql`
      INSERT INTO race_instance (event_id, venue_id, date, name, race_number, distance, surface, status, guaranteed_odds)
      VALUES (${event.id}, ${venue.id}, CURRENT_DATE, ${E2E.raceName}, 1, 1600, '芝', 'SCHEDULED', ${sql.json({ win: 2 })})
      RETURNING id
    `;

    for (let i = 0; i < horses.length; i++) {
      await sql`
        INSERT INTO race_entry (race_id, horse_id, bracket_number, horse_number)
        VALUES (${race.id}, ${horses[i].id}, ${i + 1}, ${i + 1})
      `;
    }

    return { raceId: race.id, eventId: event.id, horse1Name: horses[0].name };
  } finally {
    await sql.end();
  }
}

// イベント削除のカスケードでレース・ベット・ウォレット・取引まで消える。
// 監査ログは FK を持たないため actor 指定で個別に消す
async function cleanupWith(sql: postgres.Sql) {
  await sql`
    DELETE FROM admin_action_log
    WHERE actor_id IN (SELECT id FROM "user" WHERE name = ${E2E.adminName})
  `;
  await sql`DELETE FROM event WHERE name = ${E2E.eventName}`;
  await sql`DELETE FROM guest_code WHERE code = ${E2E.guestCode}`;
  await sql`DELETE FROM "user" WHERE name IN (${E2E.adminName}, ${E2E.guestName})`;
}

export async function cleanupFixtures() {
  const sql = createSql();
  try {
    await cleanupWith(sql);
  } finally {
    await sql.end();
  }
}

// ゲストのウォレット残高と的中ベットを DB で直接検証する。
// UI の表示揺れに依存せず、金額の正しさはここで担保する
export async function fetchSettlementState(eventId: string) {
  const sql = createSql();
  try {
    const [wallet] = await sql`
      SELECT w.balance FROM wallet w
      JOIN "user" u ON u.id = w.user_id
      WHERE u.name = ${E2E.guestName} AND w.event_id = ${eventId}
    `;
    const [bet] = await sql`
      SELECT b.status, b.payout FROM bet b
      JOIN "user" u ON u.id = b.user_id
      WHERE u.name = ${E2E.guestName}
    `;
    return {
      balance: wallet ? Number(wallet.balance) : null,
      betStatus: bet ? String(bet.status) : null,
      betPayout: bet ? Number(bet.payout) : null,
    };
  } finally {
    await sql.end();
  }
}
