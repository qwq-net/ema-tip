import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { RACE_CONDITIONS, RACE_GRADES, RACE_SURFACES, RACE_TYPES } from '../../constants/race';
import { betTypeEnum } from './bet-type';
import { events } from './events';
import { horses } from './horses';
import { venueDirectionEnum, venues } from './venues';

export const raceGradeEnum = pgEnum('race_grade', RACE_GRADES);
export const raceTypeEnum = pgEnum('race_type', RACE_TYPES);
export const raceSurfaceEnum = pgEnum('race_surface', RACE_SURFACES);
export const raceConditionEnum = pgEnum('race_condition', RACE_CONDITIONS);
export const raceStatusEnum = pgEnum('race_status', ['SCHEDULED', 'CLOSED', 'FINALIZED']);
export const raceEntryStatusEnum = pgEnum('race_entry_status', ['ENTRANT', 'SCRATCHED', 'EXCLUDED']);

export const raceDefinitions = pgTable('race_definition', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code'),
  grade: raceGradeEnum('grade').notNull(),
  type: raceTypeEnum('type').default('REAL').notNull(),
  defaultDirection: venueDirectionEnum('default_direction').notNull(),
  defaultDistance: integer('default_distance').notNull(),
  defaultVenueId: uuid('default_venue_id')
    .notNull()
    .references(() => venues.id),
  defaultSurface: raceSurfaceEnum('default_surface').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const raceInstances = pgTable(
  'race_instance',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    raceDefinitionId: uuid('race_definition_id').references(() => raceDefinitions.id),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    venueId: uuid('venue_id')
      .references(() => venues.id)
      .notNull(),
    name: text('name').notNull(),
    raceNumber: integer('race_number'),
    distance: integer('distance').notNull(),
    surface: raceSurfaceEnum('surface').notNull(),
    condition: raceConditionEnum('condition'),
    direction: venueDirectionEnum('direction'),
    status: raceStatusEnum('status').default('SCHEDULED').notNull(),
    closingAt: timestamp('closing_at', { withTimezone: true }),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
    guaranteedOdds: jsonb('guaranteed_odds').$type<Record<string, number>>(),
    netkeibaUrl: text('netkeiba_url'),
    fixedOddsMode: boolean('fixed_odds_mode').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    eventIdx: index('race_instance_event_idx').on(table.eventId),
    statusIdx: index('race_instance_status_idx').on(table.status),
    dateIdx: index('race_instance_date_idx').on(table.date),
    venueIdx: index('race_instance_venue_idx').on(table.venueId),
    definitionIdx: index('race_instance_definition_idx').on(table.raceDefinitionId),
  })
);

export const raceEntries = pgTable(
  'race_entry',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    raceId: uuid('race_id')
      .notNull()
      .references(() => raceInstances.id, { onDelete: 'cascade' }),
    horseId: uuid('horse_id')
      .notNull()
      .references(() => horses.id, { onDelete: 'cascade' }),
    bracketNumber: integer('bracket_number'),
    horseNumber: integer('horse_number'),
    jockey: text('jockey'),
    finishPosition: integer('finish_position'),
    status: raceEntryStatusEnum('status').default('ENTRANT').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // raceId 単独の照会は race_pos_idx の先頭列で賄えるため単独インデックスは持たない
    racePosIdx: index('race_entry_race_pos_idx').on(table.raceId, table.finishPosition),
    horseIdx: index('race_entry_horse_idx').on(table.horseId),
    raceHorseUniqueIdx: uniqueIndex('race_entry_race_horse_unique_idx').on(table.raceId, table.horseId),
    raceHorseNumberUniqueIdx: uniqueIndex('race_entry_race_horse_number_unique_idx').on(
      table.raceId,
      table.horseNumber
    ),
  })
);

export const raceOdds = pgTable('race_odds', {
  id: uuid('id').defaultRandom().primaryKey(),
  raceId: uuid('race_id')
    .notNull()
    .unique()
    .references(() => raceInstances.id, { onDelete: 'cascade' }),
  winOdds: jsonb('win_odds').$type<Record<string, number>>(),
  // 馬番→人気順。丸め済みオッズではなく単勝の賭け金額から算出し、同額は件数と馬番で割って重複させない
  winPopularity: jsonb('win_popularity').$type<Record<string, number>>(),
  placeOdds: jsonb('place_odds').$type<Record<string, { min: number; max: number }>>(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const payoutResults = pgTable(
  'payout_result',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    raceId: uuid('race_id')
      .notNull()
      .references(() => raceInstances.id, { onDelete: 'cascade' }),
    type: betTypeEnum('type').notNull(),
    // guaranteed は保証オッズで倍率が引き上げられた組み合わせにのみ true を格納する
    combinations: jsonb('combinations')
      .$type<{ numbers: number[]; payout: number; popularity?: number; guaranteed?: boolean }[]>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // raceId 単独の照会は複合ユニークの先頭列で賄う
    raceTypeUniqueIdx: uniqueIndex('payout_result_race_type_unique_idx').on(table.raceId, table.type),
  })
);
