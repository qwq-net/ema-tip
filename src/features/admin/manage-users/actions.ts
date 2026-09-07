'use server';

import { ROLES, type Role } from '@/entities/user';
import { db } from '@/shared/db';
import { users } from '@/shared/db/schema';
import { ActionError, requireAdmin, runAction } from '@/shared/utils/admin';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// ユーザーの役割を変更する。操作者自身の管理者権限を外す変更は拒否し、{ success: false, error } で返す
export async function updateUserRole(userId: string, newRole: Role) {
  return runAction(async () => {
    const session = await requireAdmin();
    const adminUserId = session.user.id;
    if (!adminUserId) {
      throw new ActionError('認証されていません');
    }

    if (userId === adminUserId && newRole !== ROLES.ADMIN) {
      throw new ActionError('自身の管理者権限は変更できません');
    }

    await db.update(users).set({ role: newRole }).where(eq(users.id, userId));

    revalidatePath('/admin/users');
  });
}

// ユーザーの有効と無効を反転する。操作者自身とユーザー不在は拒否し、{ success: false, error } で返す
export async function toggleUserStatus(userId: string) {
  return runAction(async () => {
    const session = await requireAdmin();
    const adminUserId = session.user.id;
    if (!adminUserId) {
      throw new ActionError('認証されていません');
    }

    if (userId === adminUserId) {
      throw new ActionError('自身のアカウントは無効化できません');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new ActionError('ユーザーが見つかりません');
    }

    const newDisabledAt = user.disabledAt ? null : new Date();

    await db.update(users).set({ disabledAt: newDisabledAt }).where(eq(users.id, userId));

    revalidatePath('/admin/users');
  });
}

// ユーザーを削除する。操作者自身の削除は拒否し、{ success: false, error } で返す
export async function deleteUser(userId: string) {
  return runAction(async () => {
    const session = await requireAdmin();
    const adminUserId = session.user.id;
    if (!adminUserId) {
      throw new ActionError('認証されていません');
    }

    if (userId === adminUserId) {
      throw new ActionError('自身のアカウントは削除できません');
    }

    await db.delete(users).where(eq(users.id, userId));

    revalidatePath('/admin/users');
  });
}
