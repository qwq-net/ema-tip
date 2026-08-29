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
import { RACE_GRADES, RACE_TYPES } from '../../constants/race';
import { events } from './events';
import { horses } from './horses';
import { venueDirectionEnum, venues } from './venues';

export const raceGradeEnum = pgEnum('race_grade', RACE_GRADES);
export const raceTypeEnum = pgEnum('race_type', RACE_TYPES);
export const raceStatusEnum = pgEnum('race_status', ['SCHEDULED', 'CLOSED', 'FINALIZED', 'CANCELLED']);
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
  defaultSurface: text('default_surface').notNull(),
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
    surface: text('surface').notNull(),
    condition: text('condition'),
    grade: raceGradeEnum('grade'),
    direction: venueDirectionEnum('direction'),
    type: raceTypeEnum('type').default('REAL').notNull(),
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
    weight: integer('weight'),
    finishPosition: integer('finish_position'),
    status: raceEntryStatusEnum('status').default('ENTRANT').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    raceIdx: index('race_entry_race_idx').on(table.raceId),
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
    type: text('type').notNull(),
    combinations: jsonb('combinations').$type<{ numbers: number[]; payout: number; popularity?: number }[]>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    raceIdx: index('payout_result_race_idx').on(table.raceId),
    raceTypeUniqueIdx: uniqueIndex('payout_result_race_type_unique_idx').on(table.raceId, table.type),
  })
);

export const horseWins = pgTable(
  'horse_win',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    horseId: uuid('horse_id')
      .notNull()
      .references(() => horses.id, { onDelete: 'cascade' }),
    raceInstanceId: uuid('race_instance_id').references(() => raceInstances.id, { onDelete: 'set null' }),
    raceDefinitionId: uuid('race_definition_id').references(() => raceDefinitions.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    date: date('date'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    horseIdx: index('horse_win_horse_idx').on(table.horseId),
  })
);
