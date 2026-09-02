import {
  bigint,
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const eventStatusEnum = pgEnum('event_status', ['SCHEDULED', 'ACTIVE', 'COMPLETED']);
export const rankingDisplayModeEnum = pgEnum('ranking_display_mode', ['HIDDEN', 'ANONYMOUS', 'FULL', 'FULL_WITH_LOAN']);

export const events = pgTable(
  'event',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    distributeAmount: bigint('distribute_amount', { mode: 'number' }).notNull(),
    loanAmount: bigint('loan_amount', { mode: 'number' }),
    loanEnabled: boolean('loan_enabled').default(true).notNull(),
    // 融資バナーの発生条件。残高が配布額のこの割合以下になると対象になる
    loanThresholdPercent: integer('loan_threshold_percent').default(30).notNull(),
    carryoverAmount: bigint('carryover_amount', { mode: 'number' }).default(0).notNull(),
    status: eventStatusEnum('status').default('SCHEDULED').notNull(),
    rankingDisplayMode: rankingDisplayModeEnum('ranking_display_mode').default('HIDDEN').notNull(),
    date: date('date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    dateIdx: index('event_date_idx').on(table.date),
    statusIdx: index('event_status_idx').on(table.status),
  })
);

export const guaranteedOddsMaster = pgTable('guaranteed_odds_master', {
  key: text('key').primaryKey(),
  odds: numeric('odds').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
