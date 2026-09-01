import { sql } from 'drizzle-orm';
import { bigint, check, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { events } from './events';

export const transactionTypeEnum = pgEnum('transaction_type', [
  'DISTRIBUTION',
  'BET',
  'PAYOUT',
  'REFUND',
  'ADJUSTMENT',
  'LOAN',
]);

export const wallets = pgTable(
  'wallet',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    balance: bigint('balance', { mode: 'number' }).default(0).notNull(),
    totalLoaned: bigint('total_loaned', { mode: 'number' }).default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userEventUniqueIdx: uniqueIndex('wallet_user_event_unique_idx').on(table.userId, table.eventId),
    eventIdx: index('wallet_event_idx').on(table.eventId),
    userCreatedIdx: index('wallet_user_created_idx').on(table.userId, table.createdAt),
    balanceNonNegative: check('wallet_balance_non_negative', sql`balance >= 0`),
  })
);

export const transactions = pgTable(
  'transaction',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'cascade' }),
    type: transactionTypeEnum('type').notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    referenceId: uuid('reference_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // walletId 単独の照会・カスケード削除も複合の先頭列で賄う。
    // referenceId と createdAt 単独で引くクエリは存在しないためインデックスは持たない
    walletCreatedIdx: index('transaction_wallet_created_idx').on(table.walletId, table.createdAt),
  })
);
