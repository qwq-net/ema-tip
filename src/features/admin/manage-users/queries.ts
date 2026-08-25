'use server';

import { db } from '@/shared/db';
import { users } from '@/shared/db/schema';
import { requireAdmin } from '@/shared/utils/admin';
import { desc } from 'drizzle-orm';

export async function getUsers() {
  await requireAdmin();

  // パスワードハッシュやOAuthトークンを含むためカラムを明示的に絞る
  return db.query.users.findMany({
    columns: {
      id: true,
      name: true,
      image: true,
      role: true,
      disabledAt: true,
      createdAt: true,
    },
    with: {
      accounts: {
        columns: { provider: true },
      },
    },
    orderBy: [desc(users.createdAt)],
  });
}
