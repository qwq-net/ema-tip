import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// 監査ログの補足情報。締切分数や配当額など、操作ごとの数値パラメータを持つ
export type AdminActionDetail = Record<string, number | string | boolean | null | string[]>;

// 管理操作の追跡ログ。誰がいつ締切・確定・取消を行ったかを後から追うための追記専用テーブル。
// ユーザー削除でログが消えないよう users への FK は張らず、id と名前をスナップショットで持つ
export const adminActionLogs = pgTable(
  'admin_action_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: text('actor_id').notNull(),
    actorName: text('actor_name'),
    action: text('action').notNull(),
    targetId: text('target_id'),
    detail: jsonb('detail').$type<AdminActionDetail>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    createdIdx: index('admin_action_log_created_idx').on(table.createdAt),
  })
);
