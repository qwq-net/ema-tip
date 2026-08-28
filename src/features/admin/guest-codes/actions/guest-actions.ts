'use server';

import { db } from '@/shared/db';
import { guestCodes, users } from '@/shared/db/schema';
import { requireAdmin } from '@/shared/utils/admin';
import crypto from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function generateGuestCode(title: string) {
  const session = await requireAdmin();
  const adminUserId = session.user?.id;
  if (!adminUserId) {
    throw new Error('認証されていません');
  }

  const code = crypto.randomBytes(8).toString('hex').toUpperCase();

  await db.insert(guestCodes).values({
    code,
    title,
    createdBy: adminUserId,
  });

  revalidatePath('/admin/users');
  return { success: true, code };
}

export async function getGuestCodes() {
  await requireAdmin();

  const codes = await db.query.guestCodes.findMany({
    orderBy: [desc(guestCodes.createdAt)],
    with: {
      // パスワードハッシュ等を含むためカラムを明示的に絞る
      creator: {
        columns: { name: true },
      },
    },
  });

  return codes;
}

export async function invalidateGuestCode(code: string) {
  await requireAdmin();

  await db.update(guestCodes).set({ disabledAt: new Date() }).where(eq(guestCodes.code, code));

  revalidatePath('/admin/users');
}

export async function invalidateUsersByCode(code: string) {
  await requireAdmin();

  await db.update(users).set({ disabledAt: new Date() }).where(eq(users.guestCodeId, code));

  revalidatePath('/admin/users');
}
