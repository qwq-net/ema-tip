import { BET_TYPES, type BetType } from '@/entities/bet/constants';
import type { HorseTagType } from '@/entities/horse/types';
import { ROLES } from '@/entities/user/constants';
import { HORSE_TAG_TYPES, HORSE_TYPES } from '@/shared/constants/horse';
import { DEFAULT_GUARANTEED_ODDS } from '@/shared/constants/odds';
import { RACE_CONDITIONS, RACE_GRADES, RACE_SURFACES, VENUE_AREAS, VENUE_DIRECTIONS } from '@/shared/constants/race';
import { lookup } from '@/shared/utils/lookup';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { calculateBracketNumber } from '../utils/bracket';
import { firstRow } from '../utils/first-row';
import { db } from './index';
import * as schema from './schema';
import horsesDataRaw from './seeds/horses.json';
import racesDataRaw from './seeds/races.json';
import venuesDataRaw from './seeds/venues.json';

// seeds/*.json は手管理のマスタ。列挙値や必須項目の崩れを DB へ触れる前に落とす
const VenueSeedSchema = z.object({
  code: z.string(),
  name: z.string(),
  shortName: z.string(),
  direction: z.enum(VENUE_DIRECTIONS),
  area: z.enum(VENUE_AREAS),
});

const RaceSeedSchema = z.object({
  name: z.string(),
  grade: z.enum(RACE_GRADES),
  venue: z.string(),
  surface: z.enum(RACE_SURFACES),
  distance: z.number().int().positive(),
  direction: z.enum(VENUE_DIRECTIONS),
});

// gender は牡と牝だけを列挙値へ移し、それ以外はセン馬として扱うため文字列のまま受ける
const HorseSeedSchema = z.object({
  name: z.string(),
  gender: z.string(),
  age: z.number().int().nullable(),
  type: z.enum(HORSE_TYPES).optional(),
  tags: z.array(z.object({ type: z.enum(HORSE_TAG_TYPES), content: z.string() })).optional(),
});

/**
 * マスタ JSON の 1 件ずつを検証し、全件通ったときだけ配列を返す。
 * 1 件でも想定と違えばファイル名と該当箇所を添えて throw し、投入を始めさせない。
 */
function parseSeedFile<T>(fileName: string, itemSchema: z.ZodType<T>, raw: object[]): T[] {
  const result = z.array(itemSchema).safeParse(raw);
  if (result.success) return result.data;

  const details = result.error.issues.map((issue) => `  [${issue.path.join('.')}] ${issue.message}`).join('\n');
  throw new Error(`seeds/${fileName} の形式が不正です。\n${details}`);
}

const venuesData = parseSeedFile('venues.json', VenueSeedSchema, venuesDataRaw);
const racesData = parseSeedFile('races.json', RaceSeedSchema, racesDataRaw);
const horsesData = parseSeedFile('horses.json', HorseSeedSchema, horsesDataRaw);

const getRandomCondition = () => RACE_CONDITIONS[Math.floor(Math.random() * RACE_CONDITIONS.length)];

// seeds/horses.json の性別表記をスキーマの列挙値へ移す。牡と牝以外はすべてセン馬として扱う
const SEED_GENDERS = { 牡: 'HORSE', 牝: 'MARE' } as const;

/** シードするレースの状態を並び順で決める。先頭 2 件は払戻確定、3 件目は締切済み、以降は出走前にする。 */
function seedRaceStatus(index: number): 'FINALIZED' | 'CLOSED' | 'SCHEDULED' {
  if (index < 2) return 'FINALIZED';
  return index === 2 ? 'CLOSED' : 'SCHEDULED';
}

function generateDummyWinOdds(entryCount: number) {
  const odds: Record<string, number> = {};
  for (let i = 1; i <= entryCount; i++) {
    odds[String(i)] = Math.round((1.5 + Math.random() * 30) * 10) / 10;
  }
  return odds;
}

function generateDummyPlaceOdds(entryCount: number) {
  const odds: Record<string, { min: number; max: number }> = {};
  for (let i = 1; i <= entryCount; i++) {
    const min = Math.round((1.1 + Math.random() * 5) * 10) / 10;
    const max = Math.round((min + Math.random() * 3) * 10) / 10;
    odds[String(i)] = { min, max };
  }
  return odds;
}

// 全シードユーザー共通のログインパスワード。絵文字キーパッドで入力できる3文字
const SEED_PASSWORD = '🐶🐶🐶';
// 新規登録の動作確認に使うゲストコード
const SEED_GUEST_CODE = 'WELCOME1';

const usersToCreate = [
  { name: '武豊', role: ROLES.ADMIN, email: 'admin@example.com' },
  { name: 'ルメール', role: ROLES.USER, email: 'user@example.com' },
  { name: '川田将雅', role: ROLES.GUEST, email: 'guest@example.com' },
  { name: '横山武史', role: ROLES.TIPSTER, email: 'tipster@example.com' },
  { name: '[AI] 戸崎圭太', role: ROLES.AI_TIPSTER, email: 'ai_tipster@example.com' },
  { name: '[AI] 福永祐一', role: ROLES.AI_USER, email: 'ai_user@example.com' },
];

interface EventTemplate {
  name: string;
  description: string;
  distributeAmount: number;
  date: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';
  // イベント全体のデフォルト購入可能種別。null は制限なし
  allowedBetTypes: BetType[] | null;
}

const eventTemplates: EventTemplate[] = [
  {
    name: '第334回 拠り所杯',
    description: '第334回 拠り所杯 馬刺しになるのは誰だ！',
    distributeAmount: 100000,
    date: '2026-02-15',
    status: 'SCHEDULED',
    // イベントデフォルト制限の動作確認用
    allowedBetTypes: [BET_TYPES.WIN, BET_TYPES.PLACE],
  },
  {
    name: '第335回 新春記念',
    description: '新春を祝う伝統の一戦',
    distributeAmount: 150000,
    date: '2026-02-01',
    status: 'ACTIVE',
    allowedBetTypes: null,
  },
  {
    name: '第336回 冬記王者決定戦',
    description: '冬の王者を決める熱戦',
    distributeAmount: 200000,
    date: '2026-01-25',
    status: 'COMPLETED',
    allowedBetTypes: null,
  },
  {
    name: '第337回 年末グランプリ',
    description: '年末を締めくくる大一番',
    distributeAmount: 180000,
    date: '2025-12-28',
    status: 'COMPLETED',
    allowedBetTypes: null,
  },
];

const HORSE_TAG_MASTER_DATA: { type: HorseTagType; content: string }[] = [
  { type: 'LEG_TYPE', content: '芝' },
  { type: 'LEG_TYPE', content: 'ダート' },
  { type: 'LEG_TYPE', content: '~1200m' },
  { type: 'LEG_TYPE', content: '1200~1600m' },
  { type: 'LEG_TYPE', content: '1200~2000m' },
  { type: 'LEG_TYPE', content: '1600~2000m' },
  { type: 'LEG_TYPE', content: '2000~2400m' },
  { type: 'LEG_TYPE', content: '2000~3000m' },
  { type: 'LEG_TYPE', content: '2400~3200m' },
  { type: 'LEG_TYPE', content: '万能' },
  { type: 'LEG_TYPE', content: '短距離' },
  { type: 'LEG_TYPE', content: '長距離' },
  { type: 'LEG_TYPE', content: '自在' },
  { type: 'CHARACTERISTIC', content: '逃げ' },
  { type: 'CHARACTERISTIC', content: '先行' },
  { type: 'CHARACTERISTIC', content: '差し' },
  { type: 'CHARACTERISTIC', content: '追い込み' },
  { type: 'CHARACTERISTIC', content: 'まくり' },
  { type: 'CHARACTERISTIC', content: '冬競馬' },
  { type: 'CHARACTERISTIC', content: '夏競馬' },
  { type: 'CHARACTERISTIC', content: 'ローカル' },
  { type: 'CHARACTERISTIC', content: '大舞台' },
  { type: 'CHARACTERISTIC', content: '右回り' },
  { type: 'CHARACTERISTIC', content: '左回り' },
  { type: 'CHARACTERISTIC', content: '小回り' },
  { type: 'CHARACTERISTIC', content: '直線' },
  { type: 'CHARACTERISTIC', content: '坂' },
  { type: 'CHARACTERISTIC', content: '平坦' },
  { type: 'CHARACTERISTIC', content: '道悪' },
  { type: 'CHARACTERISTIC', content: '良馬場' },
  { type: 'BIOGRAPHY', content: 'G1' },
  { type: 'BIOGRAPHY', content: '重賞' },
  { type: 'BIOGRAPHY', content: '三冠' },
  { type: 'BIOGRAPHY', content: '人気薄' },
  { type: 'BIOGRAPHY', content: '人気高' },
];

const isMasterOnly = process.argv.includes('--master-only');

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// イベント 1 件あたりのレース数
const RACES_PER_EVENT = 5;

const raceDefinitionNames = racesData.map((d) => d.name);

interface SeededHorse {
  id: string;
  name: string;
}

interface SeededUser {
  id: string;
  name: string | null;
  role: string;
}

interface SeededEvent {
  id: string;
  status: EventTemplate['status'];
  distributeAmount: number;
}

// 出走登録に書き込む 1 頭分の値。予想と払戻のシードでも同じ配列を使い回す
interface RaceEntrySeedValue {
  raceId: string;
  horseId: string;
  bracketNumber: number;
  horseNumber: number;
  status: 'ENTRANT';
}

// 購入済み馬券を入れる対象レース。イベント走査の途中で決まり、財布の投入後に使う
interface BetsTarget {
  eventId: string;
  raceId: string;
  horseNumbers: number[];
}

/** 保証オッズのマスタを投入する。既存キーは値を上書きし、無いキーだけ追加する。 */
async function seedGuaranteedOdds(tx: Tx): Promise<void> {
  for (const [key, odds] of Object.entries(DEFAULT_GUARANTEED_ODDS)) {
    const existing = await tx.query.guaranteedOddsMaster.findFirst({
      where: (t, { eq }) => eq(t.key, key),
    });

    if (existing) {
      await tx
        .update(schema.guaranteedOddsMaster)
        .set({ odds: odds.toString() })
        .where(eq(schema.guaranteedOddsMaster.key, key));
    } else {
      await tx.insert(schema.guaranteedOddsMaster).values({
        key,
        odds: odds.toString(),
      });
    }
  }
  console.log('Guaranteed Odds Master seeded');
}

/** 競馬場マスタを投入し、競馬場名から ID を引くマップを返す。同名の競馬場が既にあれば作り直さない。 */
async function seedVenues(tx: Tx): Promise<Record<string, string>> {
  const venueMap: Record<string, string> = {};
  let createdVenueCount = 0;

  for (const v of venuesData) {
    const existing = await tx.query.venues.findFirst({
      where: (venues, { eq }) => eq(venues.name, v.name),
    });

    if (existing) {
      venueMap[v.name] = existing.id;
    } else {
      const insertedVenues = await tx
        .insert(schema.venues)
        .values({
          name: v.name,
          shortName: v.shortName,
          code: v.code,
          defaultDirection: v.direction,
          area: v.area,
        })
        .returning();
      venueMap[v.name] = firstRow(insertedVenues, '競馬場').id;
      createdVenueCount++;
      console.log(`Racecourse created: ${v.name}`);
    }
  }
  if (createdVenueCount === 0) console.log('Venues: all exist, skipped');

  return venueMap;
}

/**
 * レース定義マスタを投入し、レース名から ID と格付けを引くマップを返す。
 * 既定の競馬場は引数のマップから解決するため、競馬場の投入後に呼ぶこと。
 */
async function seedRaceDefinitions(
  tx: Tx,
  venueMap: Record<string, string>
): Promise<Record<string, { id: string; grade: (typeof RACE_GRADES)[number] }>> {
  const raceDefinitionMap: Record<string, { id: string; grade: (typeof RACE_GRADES)[number] }> = {};
  let createdDefCount = 0;

  for (const def of racesData) {
    const existing = await tx.query.raceDefinitions.findFirst({
      where: (d, { eq }) => eq(d.name, def.name),
    });

    if (existing) {
      raceDefinitionMap[def.name] = { id: existing.id, grade: existing.grade };
    } else {
      const defaultVenueId = venueMap[def.venue];
      if (defaultVenueId === undefined) {
        throw new Error(`レース定義「${def.name}」の既定競馬場「${def.venue}」が見つかりません`);
      }

      const insertedDefinitions = await tx
        .insert(schema.raceDefinitions)
        .values({
          name: def.name,
          grade: def.grade,
          type: 'REAL',
          defaultDirection: def.direction,
          defaultDistance: def.distance,
          defaultSurface: def.surface,
          defaultVenueId,
        })
        .returning();
      const inserted = firstRow(insertedDefinitions, 'レース定義');
      raceDefinitionMap[def.name] = { id: inserted.id, grade: inserted.grade };
      createdDefCount++;
      console.log(`Race Definition created: ${def.name}`);
    }
  }
  if (createdDefCount === 0) console.log('Race Definitions: all exist, skipped');

  return raceDefinitionMap;
}

/** 馬タグのマスタを投入する。種別と内容が一致する行が既にあれば追加しない。 */
async function seedHorseTagMaster(tx: Tx): Promise<void> {
  let createdTagCount = 0;
  for (const tag of HORSE_TAG_MASTER_DATA) {
    const existing = await tx.query.horseTagMaster.findFirst({
      where: (t, { and, eq }) => and(eq(t.type, tag.type), eq(t.content, tag.content)),
    });

    if (!existing) {
      await tx.insert(schema.horseTagMaster).values({
        type: tag.type,
        content: tag.content,
      });
      createdTagCount++;
      console.log(`Tag created: ${tag.type} - ${tag.content}`);
    }
  }
  if (createdTagCount === 0) console.log('Horse Tag Master: all exist, skipped');
}

/**
 * 競走馬を投入し、既存分も含めた全頭の ID と名前を返す。
 * 名前が「外 」で始まる馬は外国産として登録し、その接頭辞は名前から落とす。
 */
async function seedHorses(tx: Tx): Promise<SeededHorse[]> {
  const allHorses: SeededHorse[] = [];
  let createdHorseCount = 0;

  for (const horseData of horsesData) {
    const isForeign = horseData.name.startsWith('外 ');
    const cleanedName = horseData.name.replace(/^外 /, '');

    const existing = await tx.query.horses.findFirst({
      where: (h, { eq }) => eq(h.name, cleanedName),
    });

    if (existing) {
      allHorses.push(existing);
    } else {
      const insertedHorses = await tx
        .insert(schema.horses)
        .values({
          name: cleanedName,
          gender: lookup(SEED_GENDERS, horseData.gender) ?? 'GELDING',
          age: horseData.age,
          origin: isForeign ? 'FOREIGN_BRED' : 'DOMESTIC',
          type: horseData.type || 'REAL',
        })
        .returning();
      const horse = firstRow(insertedHorses, '馬');

      if (horseData.tags && horseData.tags.length > 0) {
        await tx.insert(schema.horseTags).values(
          horseData.tags.map((tag) => ({
            horseId: horse.id,
            type: tag.type,
            content: tag.content,
          }))
        );
      }
      allHorses.push(horse);
      createdHorseCount++;
      console.log(`Created horse: ${horse.name}`);
    }
  }
  if (createdHorseCount === 0) console.log('Horses: all exist, skipped');

  return allHorses;
}

/**
 * 動作確認用ユーザーを投入し、既存分も含めた全ユーザーを返す。
 * 全員が同じシード用パスワードでログインできる状態にする。
 */
async function seedUsers(tx: Tx): Promise<SeededUser[]> {
  let createdUserCount = 0;
  const allUsers: SeededUser[] = [];
  const passwordHash = bcrypt.hashSync(SEED_PASSWORD, 10);

  for (const userData of usersToCreate) {
    const existing = await tx.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, userData.email),
    });

    if (existing) {
      // 旧シードで作られたパスワード無しユーザーもログインできるよう補完する
      if (!existing.password) {
        await tx.update(schema.users).set({ password: passwordHash }).where(eq(schema.users.id, existing.id));
      }
      allUsers.push(existing);
    } else {
      const insertedUsers = await tx
        .insert(schema.users)
        .values({
          name: userData.name,
          email: userData.email,
          role: userData.role,
          password: passwordHash,
          isOnboardingCompleted: true,
        })
        .returning();
      allUsers.push(firstRow(insertedUsers, 'ユーザー'));
      createdUserCount++;
      console.log(`User created: ${userData.name} (${userData.role})`);
    }
  }
  if (createdUserCount === 0) console.log('Users: all exist, skipped');
  console.log(`Login password for all seeded users: ${SEED_PASSWORD}`);

  return allUsers;
}

/** 新規登録の動作確認に使うゲストコードを、無ければ 1 件作る。発行者は引数の管理者になる。 */
async function seedGuestCode(tx: Tx, adminUserId: string): Promise<void> {
  const existingCode = await tx.query.guestCodes.findFirst({
    where: (c, { eq }) => eq(c.code, SEED_GUEST_CODE),
  });
  if (!existingCode) {
    await tx.insert(schema.guestCodes).values({
      code: SEED_GUEST_CODE,
      title: '動作確認用コード',
      createdBy: adminUserId,
    });
    console.log(`Guest code created: ${SEED_GUEST_CODE}`);
  }
}

/** 予想家ロールのユーザー分だけ、上位 3 頭へ印を付けた予想を入れる。同一ユーザーの重複投入はしない。 */
async function seedForecasts(
  tx: Tx,
  raceId: string,
  allUsers: SeededUser[],
  entryValues: RaceEntrySeedValue[]
): Promise<void> {
  const forecastSymbols = ['◎', '◯', '▲'];
  // 印は上位の出走から順に割り当てる。出走が印より少ない開催では余った印を使わない
  const forecastSelections: Record<string, string> = {};
  forecastSymbols.forEach((symbol, index) => {
    const entry = entryValues[index];
    if (entry) forecastSelections[entry.horseId] = symbol;
  });
  const forecastUsers = allUsers.filter((u) => u.role === ROLES.TIPSTER || u.role === ROLES.AI_TIPSTER);
  for (const forecastUser of forecastUsers) {
    await tx
      .insert(schema.forecasts)
      .values({
        raceId,
        userId: forecastUser.id,
        comment: '軸は堅実に、相手は展開次第で手広く狙います。',
        selections: forecastSelections,
      })
      .onConflictDoNothing();
  }
  console.log(`  Forecasts: ${forecastUsers.length} tipsters`);
}

/**
 * 払戻確定レースの着順と単勝の払戻結果を記録する。
 * 着順は出走馬をシャッフルした上位 3 頭で決める。既に払戻結果があるレースでは何もしない。
 */
async function seedFinalizedPayout(tx: Tx, raceId: string, entryValues: RaceEntrySeedValue[]): Promise<void> {
  const existingPayout = await tx.query.payoutResults.findFirst({
    where: (p, { eq }) => eq(p.raceId, raceId),
  });
  if (existingPayout) return;

  const sortedEntries = [...entryValues].sort(() => Math.random() - 0.5);
  const top3 = sortedEntries.slice(0, Math.min(3, sortedEntries.length));

  for (const [pos, entry] of top3.entries()) {
    await tx
      .update(schema.raceEntries)
      .set({ finishPosition: pos + 1 })
      .where(and(eq(schema.raceEntries.raceId, raceId), eq(schema.raceEntries.horseNumber, entry.horseNumber)));
  }

  const winner = top3.at(0);
  if (winner) {
    await tx.insert(schema.payoutResults).values({
      raceId,
      type: 'win',
      combinations: [{ numbers: [winner.horseNumber], payout: Math.round((2 + Math.random() * 20) * 10) * 10 }],
    });
  }
  console.log(`  Payout: result recorded (winner: No.${top3[0]?.horseNumber})`);
}

interface RaceInstanceSeedInput {
  eventId: string;
  eventTemplate: EventTemplate;
  raceIndex: number;
  raceDefinitionId: string;
  allHorses: SeededHorse[];
  allUsers: SeededUser[];
}

interface RaceInstanceSeedResult {
  // 既存または新規作成したレースの ID。レース定義が引けず作れなかったときは null
  raceId: string | null;
  // 購入済み馬券のシード対象になったレース。対象外なら null
  betsTarget: BetsTarget | null;
}

/**
 * イベント内のレース 1 件と、その出走登録・オッズ・予想・払戻を投入する。
 * 同じイベントと定義の組み合わせが既にあれば、その ID を返すだけで何も書かない。
 */
async function seedRaceInstance(tx: Tx, input: RaceInstanceSeedInput): Promise<RaceInstanceSeedResult> {
  const { eventId, eventTemplate, raceIndex, raceDefinitionId, allHorses, allUsers } = input;

  const def = await tx.query.raceDefinitions.findFirst({
    where: (d, { eq }) => eq(d.id, raceDefinitionId),
  });
  if (!def) return { raceId: null, betsTarget: null };

  const existingInstance = await tx.query.raceInstances.findFirst({
    where: (ri, { and, eq }) => and(eq(ri.eventId, eventId), eq(ri.raceDefinitionId, def.id)),
  });
  if (existingInstance) return { raceId: existingInstance.id, betsTarget: null };

  const raceStatus = seedRaceStatus(raceIndex);

  const insertedRaces = await tx
    .insert(schema.raceInstances)
    .values({
      eventId: eventId,
      raceDefinitionId: def.id,
      name: def.name,
      raceNumber: raceIndex + 1,
      venueId: def.defaultVenueId,
      date: eventTemplate.date,
      distance: def.defaultDistance,
      surface: def.defaultSurface,
      direction: def.defaultDirection,
      condition: getRandomCondition(),
      status: raceStatus,
    })
    .returning();
  const race = firstRow(insertedRaces, 'レース');

  console.log(`Race Instance created: ${race.name} (Event: ${eventTemplate.name})`);

  // 開催中イベントの4Rはレース個別の種別制限、5Rは予想と購入済み馬券のシード対象にする
  const isActiveEvent = eventTemplate.status === 'ACTIVE';
  if (isActiveEvent && raceIndex === 3) {
    await tx
      .insert(schema.raceAllowedBetTypes)
      .values(
        [BET_TYPES.WIN, BET_TYPES.BRACKET_QUINELLA, BET_TYPES.TRIFECTA].map((betType) => ({
          raceId: race.id,
          betType,
        }))
      )
      .onConflictDoNothing();
    console.log(`  Race bet types restricted: ${race.name}`);
  }

  const shuffledHorses = [...allHorses].sort(() => Math.random() - 0.5);
  const numEntries = Math.min(shuffledHorses.length, 12 + Math.floor(Math.random() * 6));
  const selectedHorses = shuffledHorses.slice(0, numEntries);
  const shuffledNumbers = Array.from({ length: numEntries }, (_, idx) => idx + 1).sort(() => Math.random() - 0.5);

  const entryValues = shuffledNumbers.flatMap((horseNumber, j) => {
    const horse = selectedHorses[j];
    return horse === undefined
      ? []
      : [
          {
            raceId: race.id,
            horseId: horse.id,
            bracketNumber: calculateBracketNumber(horseNumber, numEntries),
            horseNumber,
            status: 'ENTRANT' as const,
          },
        ];
  });
  await tx.insert(schema.raceEntries).values(entryValues);
  console.log(`  Entries: ${numEntries} horses registered`);

  let betsTarget: BetsTarget | null = null;
  if (isActiveEvent && raceIndex === 4) {
    betsTarget = {
      eventId,
      raceId: race.id,
      horseNumbers: entryValues.slice(0, 3).map((e) => e.horseNumber),
    };
    await seedForecasts(tx, race.id, allUsers, entryValues);
  }

  const existingOdds = await tx.query.raceOdds.findFirst({
    where: (o, { eq }) => eq(o.raceId, race.id),
  });
  if (!existingOdds) {
    await tx.insert(schema.raceOdds).values({
      raceId: race.id,
      winOdds: generateDummyWinOdds(numEntries),
      placeOdds: generateDummyPlaceOdds(numEntries),
    });
    console.log(`  Odds: win/place odds generated`);
  }

  if (raceStatus === 'FINALIZED') {
    await seedFinalizedPayout(tx, race.id, entryValues);
  }

  return { raceId: race.id, betsTarget };
}

interface EventSeedInput {
  eventTemplate: EventTemplate;
  eventIndex: number;
  raceDefinitionMap: Record<string, { id: string; grade: (typeof RACE_GRADES)[number] }>;
  allHorses: SeededHorse[];
  allUsers: SeededUser[];
}

interface EventSeedResult {
  event: SeededEvent;
  betsTarget: BetsTarget | null;
}

/**
 * イベント 1 件と、そこに紐づくレース 5 件および BET5 を投入する。
 * レース定義はイベントの並び順にずらして選ぶ。同名のイベントが既にあれば作らず、その ID の下にレースを足す。
 */
async function seedEvent(tx: Tx, input: EventSeedInput): Promise<EventSeedResult> {
  const { eventTemplate, eventIndex, raceDefinitionMap, allHorses, allUsers } = input;
  const { allowedBetTypes: defaultAllowedBetTypes, ...eventValues } = eventTemplate;

  const existingEvent = await tx.query.events.findFirst({
    where: (e, { eq }) => eq(e.name, eventTemplate.name),
  });

  let eventId: string;
  if (existingEvent) {
    eventId = existingEvent.id;
  } else {
    const event = firstRow(await tx.insert(schema.events).values(eventValues).returning(), 'イベント');
    console.log(`Event created: ${event.name} (${event.status})`);
    eventId = event.id;
  }

  if (defaultAllowedBetTypes) {
    await tx
      .insert(schema.eventDefaultAllowedBetTypes)
      .values(defaultAllowedBetTypes.map((betType) => ({ eventId, betType })))
      .onConflictDoNothing();
    console.log(`  Event default bet types: ${defaultAllowedBetTypes.join(', ')}`);
  }

  const startIndex = (eventIndex * RACES_PER_EVENT) % raceDefinitionNames.length;
  const eventRaceIds: string[] = [];
  let betsTarget: BetsTarget | null = null;

  for (let i = 0; i < RACES_PER_EVENT; i++) {
    const defName = raceDefinitionNames[(startIndex + i) % raceDefinitionNames.length] ?? '';
    const defInfo = raceDefinitionMap[defName];
    if (!defInfo) continue;

    const result = await seedRaceInstance(tx, {
      eventId,
      eventTemplate,
      raceIndex: i,
      raceDefinitionId: defInfo.id,
      allHorses,
      allUsers,
    });
    if (result.raceId === null) continue;

    eventRaceIds.push(result.raceId);
    betsTarget = result.betsTarget ?? betsTarget;
  }

  // BET5 は 5 レース固定の商品なので、RACES_PER_EVENT ではなく 5 で判定する。
  // 分割代入で受けるのは、5 本すべて揃ったことを型でも示すため
  const [bet5Race1, bet5Race2, bet5Race3, bet5Race4, bet5Race5] = eventRaceIds;
  const hasFiveRaces =
    bet5Race1 !== undefined &&
    bet5Race2 !== undefined &&
    bet5Race3 !== undefined &&
    bet5Race4 !== undefined &&
    bet5Race5 !== undefined;
  if (eventTemplate.status === 'ACTIVE' && hasFiveRaces) {
    const existingBet5 = await tx.query.bet5Events.findFirst({
      where: (b, { eq }) => eq(b.eventId, eventId),
    });
    if (!existingBet5) {
      await tx.insert(schema.bet5Events).values({
        eventId,
        race1Id: bet5Race1,
        race2Id: bet5Race2,
        race3Id: bet5Race3,
        race4Id: bet5Race4,
        race5Id: bet5Race5,
        initialPot: 50000,
        status: 'SCHEDULED',
      });
      console.log('  BET5 event created');
    }
  }

  return {
    event: { id: eventId, status: eventTemplate.status, distributeAmount: eventTemplate.distributeAmount },
    betsTarget,
  };
}

/**
 * 開始済みイベントの全ユーザーへ財布を作り、配布金の取引を 1 件ずつ書く。
 * 予定状態のイベントは配布前なので対象外。既に財布があるユーザーは飛ばす。
 */
async function seedWallets(tx: Tx, allUsers: SeededUser[], seededEvents: SeededEvent[]): Promise<void> {
  let walletCount = 0;
  const walletableEvents = seededEvents.filter((e) => e.status !== 'SCHEDULED');

  for (const eventInfo of walletableEvents) {
    for (const user of allUsers) {
      const existing = await tx.query.wallets.findFirst({
        where: (w, { and, eq }) => and(eq(w.userId, user.id), eq(w.eventId, eventInfo.id)),
      });

      if (!existing) {
        const insertedWallets = await tx
          .insert(schema.wallets)
          .values({
            userId: user.id,
            eventId: eventInfo.id,
            balance: eventInfo.distributeAmount,
          })
          .returning();
        const wallet = firstRow(insertedWallets, 'ウォレット');

        await tx.insert(schema.transactions).values({
          walletId: wallet.id,
          type: 'DISTRIBUTION',
          amount: eventInfo.distributeAmount,
          referenceId: eventInfo.id,
        });
        walletCount++;
      }
    }
  }
  if (walletCount > 0) {
    console.log(`Wallets created: ${walletCount} (with DISTRIBUTION transactions)`);
  } else {
    console.log('Wallets: all exist, skipped');
  }
}

/**
 * 対象レースへ一般ユーザーとゲストの購入済み単勝馬券を入れる。
 * 残高と取引台帳の不変条件を守るため、bet ごとの取引行と残高減算をセットで書く。
 * 同じレースに購入履歴があるユーザーと、財布が無いユーザーは飛ばす。
 */
async function seedBets(tx: Tx, allUsers: SeededUser[], betsTarget: BetsTarget): Promise<void> {
  const bettors = allUsers.filter((u) => u.role === ROLES.USER || u.role === ROLES.GUEST);
  const amountPerBet = 100;

  for (const bettor of bettors) {
    const existingGroup = await tx.query.betGroups.findFirst({
      where: (bg, { and, eq }) => and(eq(bg.userId, bettor.id), eq(bg.raceId, betsTarget.raceId)),
    });
    if (existingGroup) continue;

    const wallet = await tx.query.wallets.findFirst({
      where: (w, { and, eq }) => and(eq(w.userId, bettor.id), eq(w.eventId, betsTarget.eventId)),
    });
    if (!wallet) continue;

    const combinations = betsTarget.horseNumbers.map((n) => [n]);
    const totalAmount = combinations.length * amountPerBet;

    const insertedGroups = await tx
      .insert(schema.betGroups)
      .values({
        userId: bettor.id,
        raceId: betsTarget.raceId,
        walletId: wallet.id,
        type: BET_TYPES.WIN,
        totalAmount,
      })
      .returning();
    const group = firstRow(insertedGroups, '購入グループ');

    const insertedBets = await tx
      .insert(schema.bets)
      .values(
        combinations.map((selections) => ({
          userId: bettor.id,
          raceId: betsTarget.raceId,
          walletId: wallet.id,
          betGroupId: group.id,
          details: { type: BET_TYPES.WIN, selections },
          amount: amountPerBet,
          status: 'PENDING' as const,
        }))
      )
      .returning({ id: schema.bets.id });

    await tx.insert(schema.transactions).values(
      insertedBets.map((bet) => ({
        walletId: wallet.id,
        type: 'BET' as const,
        amount: -amountPerBet,
        referenceId: bet.id,
      }))
    );

    await tx
      .update(schema.wallets)
      .set({ balance: wallet.balance - totalAmount })
      .where(eq(schema.wallets.id, wallet.id));

    console.log(`Bets seeded: ${bettor.name} (${combinations.length} win bets)`);
  }
}

async function main() {
  console.log(`--- Starting Seeder ${isMasterOnly ? '(Master Data Only)' : ''} ---`);

  await db.transaction(async (tx) => {
    await seedGuaranteedOdds(tx);
    const venueMap = await seedVenues(tx);
    const raceDefinitionMap = await seedRaceDefinitions(tx, venueMap);
    await seedHorseTagMaster(tx);
    const allHorses = await seedHorses(tx);

    if (isMasterOnly) {
      console.log('Skipping dummy data seeding (--master-only)');
      return;
    }

    const allUsers = await seedUsers(tx);

    const adminUser = allUsers.find((u) => u.role === ROLES.ADMIN);
    if (adminUser) await seedGuestCode(tx, adminUser.id);

    const seededEvents: SeededEvent[] = [];
    // 開催中イベントの受付中レース。あとで購入済み馬券のシードに使う
    let betsTarget: BetsTarget | null = null;

    for (const [eventIndex, eventTemplate] of eventTemplates.entries()) {
      const result = await seedEvent(tx, {
        eventTemplate,
        eventIndex,
        raceDefinitionMap,
        allHorses,
        allUsers,
      });
      seededEvents.push(result.event);
      betsTarget = result.betsTarget ?? betsTarget;
    }

    await seedWallets(tx, allUsers, seededEvents);

    if (betsTarget) await seedBets(tx, allUsers, betsTarget);
  });

  console.log('--- Seeder Completed Successfully ---');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((cause: unknown) => {
    console.error('Seeder failed:', cause);
    process.exit(1);
  });
