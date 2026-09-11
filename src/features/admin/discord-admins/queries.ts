'use server';

import { db } from '@/shared/db';
import { adminDiscordIds } from '@/shared/db/schema';
import { requireAdmin } from '@/shared/utils/admin';
import { desc } from 'drizzle-orm';

/** 管理者として登録する Discord の固有 ID を新しい順に返す。追加した人の名前も添える。 */
export async function getAdminDiscordIds() {
  await requireAdmin();

  return db.query.adminDiscordIds.findMany({
    orderBy: [desc(adminDiscordIds.createdAt)],
    with: {
      // パスワードハッシュ等を含むためカラムを明示的に絞る
      creator: {
        columns: { name: true },
      },
    },
  });
}
