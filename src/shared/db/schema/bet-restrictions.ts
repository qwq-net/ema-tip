import { pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { betTypeEnum } from './bet-type';
import { events } from './events';
import { raceInstances } from './races';

// レース単位の購入可能な馬券種別。1行が許可種別1つを表す。
// 行が0件のレースは未設定を意味し、イベントのデフォルト設定へフォールバックする
export const raceAllowedBetTypes = pgTable(
  'race_allowed_bet_type',
  {
    raceId: uuid('race_id')
      .notNull()
      .references(() => raceInstances.id, { onDelete: 'cascade' }),
    betType: betTypeEnum('bet_type').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.raceId, table.betType] }),
  })
);

// イベント単位のデフォルト購入可能種別。行が0件のイベントは制限なしを意味する
export const eventDefaultAllowedBetTypes = pgTable(
  'event_default_allowed_bet_type',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    betType: betTypeEnum('bet_type').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.eventId, table.betType] }),
  })
);
