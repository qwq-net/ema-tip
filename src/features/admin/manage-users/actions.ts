'use server';

import { ROLES, type Role } from '@/entities/user';
import { db } from '@/shared/db';
import { bets, users, wallets } from '@/shared/db/schema';
import { ActionError, requireAdmin, runAction } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
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

    const target = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { name: true, role: true },
    });
    if (!target) {
      throw new ActionError('ユーザーが見つかりません');
    }
    if (target.role === newRole) return;

    await db.update(users).set({ role: newRole }).where(eq(users.id, userId));
    await logAdminAction(db, session.user, {
      action: 'user.change_role',
      targetId: userId,
      detail: { userName: target.name, from: target.role, to: newRole },
    });

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
    await logAdminAction(db, session.user, {
      action: newDisabledAt ? 'user.disable' : 'user.enable',
      targetId: userId,
      detail: { userName: user.name },
    });

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

    await db.transaction(async (tx) => {
      const target = await tx.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { name: true, role: true },
      });
      if (!target) {
        throw new ActionError('ユーザーが見つかりません');
      }

      // ウォレットと取引台帳とベットは外部キーの連鎖でこの削除と同時に消える。
      // 消えた後では残高も購入履歴も復元できないため、消す前の姿を監査ログへ焼き付ける
      const ownedWallets = await tx
        .select({ eventId: wallets.eventId, balance: wallets.balance, totalLoaned: wallets.totalLoaned })
        .from(wallets)
        .where(eq(wallets.userId, userId));
      const ownedBets = await tx.select({ id: bets.id }).from(bets).where(eq(bets.userId, userId));

      await logAdminAction(tx, session.user, {
        action: 'user.delete',
        targetId: userId,
        detail: {
          userName: target.name,
          role: target.role,
          walletCount: ownedWallets.length,
          totalBalance: ownedWallets.reduce((sum, w) => sum + w.balance, 0),
          totalLoaned: ownedWallets.reduce((sum, w) => sum + w.totalLoaned, 0),
          betCount: ownedBets.length,
          wallets: ownedWallets.map((w) => `${w.eventId}:${w.balance}:${w.totalLoaned}`),
        },
      });

      await tx.delete(users).where(eq(users.id, userId));
    });

    revalidatePath('/admin/users');
  });
}
