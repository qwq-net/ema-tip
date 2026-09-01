import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { raceInstances } from './races';

export const forecasts = pgTable(
  'forecast',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    raceId: uuid('race_id')
      .notNull()
      .references(() => raceInstances.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    comment: text('comment'),
    selections: jsonb('selections').$type<Record<string, string>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // raceId 単独の照会は複合ユニークの先頭列で賄う
    userIdx: index('forecast_user_idx').on(table.userId),
    raceUserUniqueIdx: uniqueIndex('forecast_race_user_unique_idx').on(table.raceId, table.userId),
  })
);
