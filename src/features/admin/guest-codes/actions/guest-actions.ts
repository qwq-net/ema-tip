'use server';

import { db } from '@/shared/db';
import { guestCodes, users } from '@/shared/db/schema';
import { requireAdmin } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import crypto from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function generateGuestCode(title: string) {
  const session = await requireAdmin();
  const adminUserId = session.user.id;
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
  const session = await requireAdmin();

  await db.update(guestCodes).set({ disabledAt: new Date() }).where(eq(guestCodes.code, code));
  await logAdminAction(db, session.user, { action: 'guest_code.invalidate', targetId: code });

  revalidatePath('/admin/users');
}

export async function invalidateUsersByCode(code: string) {
  const session = await requireAdmin();

  // 1 コードに紐づく全員をまとめて凍結する破壊的な操作。
  // 誰が何人を止めたのかを残さないと、後から範囲を確かめる手段がない
  const frozen = await db
    .update(users)
    .set({ disabledAt: new Date() })
    .where(eq(users.guestCodeId, code))
    .returning({ id: users.id });

  await logAdminAction(db, session.user, {
    action: 'guest_code.disable_users',
    targetId: code,
    detail: { userCount: frozen.length, userIds: frozen.map((u) => u.id) },
  });

  revalidatePath('/admin/users');
}
