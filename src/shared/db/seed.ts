import { BET_TYPES, type BetType } from '@/entities/bet';
import type { HorseTagType, HorseType } from '@/entities/horse';
import { ROLES } from '@/entities/user';
import { DEFAULT_GUARANTEED_ODDS } from '@/shared/constants/odds';
import { RACE_CONDITIONS, RACE_GRADES, RACE_SURFACES, VENUE_AREAS, VENUE_DIRECTIONS } from '@/shared/constants/race';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { calculateBracketNumber } from '../utils/bracket';
import { db } from './index';
import * as schema from './schema';
import horsesDataRaw from './seeds/horses.json';
import racesDataRaw from './seeds/races.json';
import venuesDataRaw from './seeds/venues.json';

interface VenueSeedData {
  code: string;
  name: string;
  shortName: string;
  direction: (typeof VENUE_DIRECTIONS)[number];
  area: (typeof VENUE_AREAS)[number];
}

interface RaceSeedData {
  name: string;
  grade: (typeof RACE_GRADES)[number];
  venue: string;
  surface: (typeof RACE_SURFACES)[number];
  distance: number;
  direction: (typeof VENUE_DIRECTIONS)[number];
}

interface HorseSeedData {
  name: string;
  gender: string;
  age: number | null;
  type?: HorseType;
  tags?: { type: HorseTagType; content: string }[];
}

// SAFETY: seeds/*.json は手管理のマスタ。列挙値の妥当性は SeedData interface の union で表現している
const venuesData = venuesDataRaw as VenueSeedData[];
// SAFETY: 同上
const racesData = racesDataRaw as RaceSeedData[];
// SAFETY: 同上
const horsesData = horsesDataRaw as HorseSeedData[];

const getRandomCondition = () => RACE_CONDITIONS[Math.floor(Math.random() * RACE_CONDITIONS.length)];

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

const HORSE_TAG_MASTER_DATA: Array<{ type: HorseTagType; content: string }> = [
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

async function main() {
  console.log(`--- Starting Seeder ${isMasterOnly ? '(Master Data Only)' : ''} ---`);

  await db.transaction(async (tx) => {
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

    const venueMap: Record<string, string> = {};
    let createdVenueCount = 0;

    for (const v of venuesData) {
      const existing = await tx.query.venues.findFirst({
        where: (venues, { eq }) => eq(venues.name, v.name),
      });

      if (existing) {
        venueMap[v.name] = existing.id;
      } else {
        const [venue] = await tx
          .insert(schema.venues)
          .values({
            name: v.name,
            shortName: v.shortName,
            code: v.code,
            defaultDirection: v.direction,
            area: v.area,
          })
          .returning();
        venueMap[v.name] = venue.id;
        createdVenueCount++;
        console.log(`Racecourse created: ${v.name}`);
      }
    }
    if (createdVenueCount === 0) console.log('Venues: all exist, skipped');

    const raceDefinitionMap: Record<string, { id: string; grade: (typeof RACE_GRADES)[number] }> = {};
    let createdDefCount = 0;

    for (const def of racesData) {
      const existing = await tx.query.raceDefinitions.findFirst({
        where: (d, { eq }) => eq(d.name, def.name),
      });

      if (existing) {
        raceDefinitionMap[def.name] = { id: existing.id, grade: existing.grade };
      } else {
        const [inserted] = await tx
          .insert(schema.raceDefinitions)
          .values({
            name: def.name,
            grade: def.grade,
            type: 'REAL',
            defaultDirection: def.direction,
            defaultDistance: def.distance,
            defaultSurface: def.surface,
            defaultVenueId: venueMap[def.venue],
          })
          .returning();
        raceDefinitionMap[def.name] = { id: inserted.id, grade: inserted.grade };
        createdDefCount++;
        console.log(`Race Definition created: ${def.name}`);
      }
    }
    if (createdDefCount === 0) console.log('Race Definitions: all exist, skipped');

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

    const allHorses: Array<{ id: string; name: string }> = [];
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
        const [horse] = await tx
          .insert(schema.horses)
          .values({
            name: cleanedName,
            gender: horseData.gender === '牡' ? 'HORSE' : horseData.gender === '牝' ? 'MARE' : 'GELDING',
            age: horseData.age,
            origin: isForeign ? 'FOREIGN_BRED' : 'DOMESTIC',
            type: horseData.type || 'REAL',
          })
          .returning();

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

    if (isMasterOnly) {
      console.log('Skipping dummy data seeding (--master-only)');
      return;
    }

    let createdUserCount = 0;
    const allUsers: Array<{ id: string; name: string | null; role: string }> = [];
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
        const [user] = await tx
          .insert(schema.users)
          .values({
            name: userData.name,
            email: userData.email,
            role: userData.role,
            password: passwordHash,
            isOnboardingCompleted: true,
          })
          .returning();
        allUsers.push(user);
        createdUserCount++;
        console.log(`User created: ${userData.name} (${userData.role})`);
      }
    }
    if (createdUserCount === 0) console.log('Users: all exist, skipped');
    console.log(`Login password for all seeded users: ${SEED_PASSWORD}`);

    const adminUser = allUsers.find((u) => u.role === ROLES.ADMIN);
    if (adminUser) {
      const existingCode = await tx.query.guestCodes.findFirst({
        where: (c, { eq }) => eq(c.code, SEED_GUEST_CODE),
      });
      if (!existingCode) {
        await tx.insert(schema.guestCodes).values({
          code: SEED_GUEST_CODE,
          title: '動作確認用コード',
          createdBy: adminUser.id,
        });
        console.log(`Guest code created: ${SEED_GUEST_CODE}`);
      }
    }

    const racesPerEvent = 5;
    const raceDefinitionNames = racesData.map((d) => d.name);
    const createdEventIds: Array<{ id: string; status: string; distributeAmount: number }> = [];
    // 開催中イベントの受付中レース。あとで購入済み馬券のシードに使う
    let betsTarget: { eventId: string; raceId: string; horseNumbers: number[] } | null = null;

    for (let eventIndex = 0; eventIndex < eventTemplates.length; eventIndex++) {
      const eventTemplate = eventTemplates[eventIndex];
      const { allowedBetTypes: defaultAllowedBetTypes, ...eventValues } = eventTemplate;
      const existingEvent = await tx.query.events.findFirst({
        where: (e, { eq }) => eq(e.name, eventTemplate.name),
      });

      let eventId: string;
      if (existingEvent) {
        eventId = existingEvent.id;
      } else {
        const [event] = await tx.insert(schema.events).values(eventValues).returning();
        console.log(`Event created: ${event.name} (${event.status})`);
        eventId = event.id;
      }
      createdEventIds.push({
        id: eventId,
        status: eventTemplate.status,
        distributeAmount: eventTemplate.distributeAmount,
      });

      if (defaultAllowedBetTypes) {
        await tx
          .insert(schema.eventDefaultAllowedBetTypes)
          .values(defaultAllowedBetTypes.map((betType) => ({ eventId, betType })))
          .onConflictDoNothing();
        console.log(`  Event default bet types: ${defaultAllowedBetTypes.join(', ')}`);
      }

      const startIndex = (eventIndex * racesPerEvent) % raceDefinitionNames.length;
      const selectedDefNames: string[] = [];
      for (let i = 0; i < racesPerEvent; i++) {
        selectedDefNames.push(raceDefinitionNames[(startIndex + i) % raceDefinitionNames.length]);
      }

      const eventRaceIds: string[] = [];

      for (let i = 0; i < selectedDefNames.length; i++) {
        const defName = selectedDefNames[i];
        const defInfo = raceDefinitionMap[defName];
        if (!defInfo) continue;

        const def = await tx.query.raceDefinitions.findFirst({
          where: (d, { eq }) => eq(d.id, defInfo.id),
        });
        if (!def) continue;

        const existingInstance = await tx.query.raceInstances.findFirst({
          where: (ri, { and, eq }) => and(eq(ri.eventId, eventId), eq(ri.raceDefinitionId, def.id)),
        });

        if (existingInstance) {
          eventRaceIds.push(existingInstance.id);
          continue;
        }

        const raceStatus = i < 2 ? 'FINALIZED' : i === 2 ? 'CLOSED' : 'SCHEDULED';

        const [race] = await tx
          .insert(schema.raceInstances)
          .values({
            eventId: eventId,
            raceDefinitionId: def.id,
            name: def.name,
            raceNumber: i + 1,
            venueId: def.defaultVenueId,
            date: eventTemplate.date,
            distance: def.defaultDistance,
            surface: def.defaultSurface,
            direction: def.defaultDirection,
            condition: getRandomCondition(),
            status: raceStatus,
            guaranteedOdds: DEFAULT_GUARANTEED_ODDS,
          })
          .returning();
        eventRaceIds.push(race.id);

        console.log(`Race Instance created: ${race.name} (Event: ${eventTemplate.name})`);

        // 開催中イベントの4Rはレース個別の種別制限、5Rは予想と購入済み馬券のシード対象にする
        const isActiveEvent = eventTemplate.status === 'ACTIVE';
        if (isActiveEvent && i === 3) {
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

        const entryValues = selectedHorses.map((horse, j) => ({
          raceId: race.id,
          horseId: horse.id,
          bracketNumber: calculateBracketNumber(shuffledNumbers[j], numEntries),
          horseNumber: shuffledNumbers[j],
          status: 'ENTRANT' as const,
        }));
        await tx.insert(schema.raceEntries).values(entryValues);
        console.log(`  Entries: ${numEntries} horses registered`);

        if (isActiveEvent && i === 4) {
          betsTarget = {
            eventId,
            raceId: race.id,
            horseNumbers: entryValues.slice(0, 3).map((e) => e.horseNumber),
          };

          const forecastSymbols = ['◎', '◯', '▲'];
          const forecastUsers = allUsers.filter((u) => u.role === ROLES.TIPSTER || u.role === ROLES.AI_TIPSTER);
          for (const forecastUser of forecastUsers) {
            await tx
              .insert(schema.forecasts)
              .values({
                raceId: race.id,
                userId: forecastUser.id,
                comment: '軸は堅実に、相手は展開次第で手広く狙います。',
                selections: Object.fromEntries(
                  entryValues.slice(0, 3).map((e, idx) => [e.horseId, forecastSymbols[idx]])
                ),
              })
              .onConflictDoNothing();
          }
          console.log(`  Forecasts: ${forecastUsers.length} tipsters`);
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
          const existingPayout = await tx.query.payoutResults.findFirst({
            where: (p, { eq }) => eq(p.raceId, race.id),
          });
          if (!existingPayout) {
            const sortedEntries = [...entryValues].sort(() => Math.random() - 0.5);
            const top3 = sortedEntries.slice(0, Math.min(3, sortedEntries.length));

            for (let pos = 0; pos < top3.length; pos++) {
              await tx
                .update(schema.raceEntries)
                .set({ finishPosition: pos + 1 })
                .where(
                  and(eq(schema.raceEntries.raceId, race.id), eq(schema.raceEntries.horseNumber, top3[pos].horseNumber))
                );
            }

            const winnerNumber = top3[0]?.horseNumber;
            if (winnerNumber != null) {
              await tx.insert(schema.payoutResults).values({
                raceId: race.id,
                type: 'win',
                combinations: [{ numbers: [winnerNumber], payout: Math.round((2 + Math.random() * 20) * 10) * 10 }],
              });
            }
            console.log(`  Payout: result recorded (winner: No.${top3[0]?.horseNumber})`);
          }
        }
      }

      if (eventTemplate.status === 'ACTIVE' && eventRaceIds.length === racesPerEvent) {
        const existingBet5 = await tx.query.bet5Events.findFirst({
          where: (b, { eq }) => eq(b.eventId, eventId),
        });
        if (!existingBet5) {
          await tx.insert(schema.bet5Events).values({
            eventId,
            race1Id: eventRaceIds[0],
            race2Id: eventRaceIds[1],
            race3Id: eventRaceIds[2],
            race4Id: eventRaceIds[3],
            race5Id: eventRaceIds[4],
            initialPot: 50000,
            status: 'SCHEDULED',
          });
          console.log('  BET5 event created');
        }
      }
    }

    let walletCount = 0;
    const walletableEvents = createdEventIds.filter((e) => e.status !== 'SCHEDULED');

    for (const eventInfo of walletableEvents) {
      for (const user of allUsers) {
        const existing = await tx.query.wallets.findFirst({
          where: (w, { and, eq }) => and(eq(w.userId, user.id), eq(w.eventId, eventInfo.id)),
        });

        if (!existing) {
          const [wallet] = await tx
            .insert(schema.wallets)
            .values({
              userId: user.id,
              eventId: eventInfo.id,
              balance: eventInfo.distributeAmount,
            })
            .returning();

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

    // 開催中イベントの受付中レースへ、一般ユーザーの購入済み馬券を入れる。
    // 残高と取引台帳の不変条件を守るため、bet ごとの取引行と残高減算をセットで書く
    if (betsTarget) {
      const bettors = allUsers.filter((u) => u.role === ROLES.USER || u.role === ROLES.GUEST);
      const amountPerBet = 100;

      for (const bettor of bettors) {
        const existingGroup = await tx.query.betGroups.findFirst({
          where: (bg, { and, eq }) => and(eq(bg.userId, bettor.id), eq(bg.raceId, betsTarget!.raceId)),
        });
        if (existingGroup) continue;

        const wallet = await tx.query.wallets.findFirst({
          where: (w, { and, eq }) => and(eq(w.userId, bettor.id), eq(w.eventId, betsTarget!.eventId)),
        });
        if (!wallet) continue;

        const combinations = betsTarget.horseNumbers.map((n) => [n]);
        const totalAmount = combinations.length * amountPerBet;

        const [group] = await tx
          .insert(schema.betGroups)
          .values({
            userId: bettor.id,
            raceId: betsTarget.raceId,
            walletId: wallet.id,
            type: BET_TYPES.WIN,
            totalAmount,
          })
          .returning();

        const insertedBets = await tx
          .insert(schema.bets)
          .values(
            combinations.map((selections) => ({
              userId: bettor.id,
              raceId: betsTarget!.raceId,
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
  });

  console.log('--- Seeder Completed Successfully ---');
  return;
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seeder failed:', err);
    process.exit(1);
  });
