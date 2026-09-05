'use server';

import { ROLES, type Role } from '@/entities/user';
import { db } from '@/shared/db';
import { users } from '@/shared/db/schema';
import { requireAdmin } from '@/shared/utils/admin';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateUserRole(userId: string, newRole: Role) {
  const session = await requireAdmin();
  const adminUserId = session.user.id;
  if (!adminUserId) {
    throw new Error('認証されていません');
  }

  if (userId === adminUserId && newRole !== ROLES.ADMIN) {
    throw new Error('自身の管理者権限は変更できません');
  }

  await db.update(users).set({ role: newRole }).where(eq(users.id, userId));

  revalidatePath('/admin/users');
}

export async function toggleUserStatus(userId: string) {
  const session = await requireAdmin();
  const adminUserId = session.user.id;
  if (!adminUserId) {
    throw new Error('認証されていません');
  }

  if (userId === adminUserId) {
    throw new Error('自身のアカウントは無効化できません');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  const newDisabledAt = user.disabledAt ? null : new Date();

  await db.update(users).set({ disabledAt: newDisabledAt }).where(eq(users.id, userId));

  revalidatePath('/admin/users');
}

export async function deleteUser(userId: string) {
  const session = await requireAdmin();
  const adminUserId = session.user.id;
  if (!adminUserId) {
    throw new Error('認証されていません');
  }

  if (userId === adminUserId) {
    throw new Error('自身のアカウントは削除できません');
  }

  await db.delete(users).where(eq(users.id, userId));

  revalidatePath('/admin/users');
}
