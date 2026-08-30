import { ROLES } from '@/entities/user/constants';
import type { AdapterAccount } from '@auth/core/adapters';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', [
  ROLES.USER,
  ROLES.ADMIN,
  ROLES.GUEST,
  ROLES.TIPSTER,
  ROLES.AI_TIPSTER,
  ROLES.AI_USER,
]);

export const users = pgTable(
  'user',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name'),
    email: text('email').unique(),
    emailVerified: timestamp('email_verified', { mode: 'date', withTimezone: true }),
    image: text('image'),
    role: roleEnum('role').default('USER').notNull(),
    guestCodeId: text('guest_code_id'),
    password: text('password'),
    isOnboardingCompleted: boolean('is_onboarding_completed').default(false).notNull(),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // 名前はゲストログインの識別子。重複すると findFirst の解決先が不定になりログイン不能に陥る
    nameIdx: uniqueIndex('user_name_idx').on(table.name),
    guestCodeIdx: index('user_guest_code_idx').on(table.guestCodeId),
  })
);

export const accounts = pgTable(
  'account',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable(
  'session',
  {
    sessionToken: text('session_token').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
  },
  (table) => ({
    userIdx: index('session_user_idx').on(table.userId),
  })
);

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
);

export const guestCodes = pgTable('guest_code', {
  code: text('code').primaryKey(),
  title: text('title').notNull(),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  disabledAt: timestamp('disabled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
