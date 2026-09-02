import { type BetDetail } from '@/entities/bet/constants';
import {
  bigint,
  boolean,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './auth';
import { betTypeEnum } from './bet-type';
import { events } from './events';
import { raceInstances, raceStatusEnum } from './races';
import { wallets } from './wallets';

export const betStatusEnum = pgEnum('bet_status', ['PENDING', 'HIT', 'LOST', 'REFUNDED']);

export const betGroups = pgTable(
  'bet_group',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    raceId: uuid('race_id')
      .notNull()
      .references(() => raceInstances.id, { onDelete: 'cascade' }),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'cascade' }),
    type: betTypeEnum('type').notNull(),
    totalAmount: bigint('total_amount', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // 照会は常に userId と raceId の組。raceId 単独で引く経路はないため複合1本に集約する
    userRaceIdx: index('bet_group_user_race_idx').on(table.userId, table.raceId),
    // ユーザー削除時のカスケードが betGroups を walletId で辿るため残す
    walletIdx: index('bet_group_wallet_idx').on(table.walletId),
  })
);

export const bets = pgTable(
  'bet',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    raceId: uuid('race_id')
      .notNull()
      .references(() => raceInstances.id, { onDelete: 'cascade' }),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'cascade' }),
    betGroupId: uuid('bet_group_id')
      .notNull()
      .references(() => betGroups.id, { onDelete: 'cascade' }),
    details: jsonb('details').$type<BetDetail>().notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    odds: numeric('odds'),
    payout: bigint('payout', { mode: 'number' }),
    status: betStatusEnum('status').default('PENDING').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    raceIdx: index('bet_race_idx').on(table.raceId),
    userIdx: index('bet_user_idx').on(table.userId),
    groupIdx: index('bet_group_idx').on(table.betGroupId),
    walletIdx: index('bet_wallet_idx').on(table.walletId),
  })
);

export const bet5Events = pgTable(
  'bet5_event',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    race1Id: uuid('race1_id')
      .notNull()
      .references(() => raceInstances.id),
    race2Id: uuid('race2_id')
      .notNull()
      .references(() => raceInstances.id),
    race3Id: uuid('race3_id')
      .notNull()
      .references(() => raceInstances.id),
    race4Id: uuid('race4_id')
      .notNull()
      .references(() => raceInstances.id),
    race5Id: uuid('race5_id')
      .notNull()
      .references(() => raceInstances.id),
    initialPot: bigint('initial_pot', { mode: 'number' }).default(0).notNull(),
    status: raceStatusEnum('status').default('SCHEDULED').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    eventIdUniqueIdx: uniqueIndex('bet5_event_event_id_unique_idx').on(table.eventId),
  })
);

export const bet5Tickets = pgTable(
  'bet5_ticket',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bet5EventId: uuid('bet5_event_id')
      .notNull()
      .references(() => bet5Events.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'cascade' }),
    race1HorseIds: jsonb('race1_horse_ids').$type<string[]>().notNull(),
    race2HorseIds: jsonb('race2_horse_ids').$type<string[]>().notNull(),
    race3HorseIds: jsonb('race3_horse_ids').$type<string[]>().notNull(),
    race4HorseIds: jsonb('race4_horse_ids').$type<string[]>().notNull(),
    race5HorseIds: jsonb('race5_horse_ids').$type<string[]>().notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    isWin: boolean('is_win'),
    payout: bigint('payout', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIdx: index('bet5_ticket_event_idx').on(table.bet5EventId),
    userIdx: index('bet5_ticket_user_idx').on(table.userId),
  })
);
