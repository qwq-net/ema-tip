'use server';

import { db } from '@/shared/db';
import { adminDiscordIds } from '@/shared/db/schema';
import { ActionError, requireAdmin, runAction } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Discord の固有 ID はスノーフレークで、現行は 17 桁から 20 桁の 10 進数になる
const DISCORD_ID_PATTERN = /^\d{17,20}$/;

/**
 * Discord の固有 ID を管理者一覧へ足す。以後この ID で初めてログインした人は管理者として登録される。
 * 桁や文字種が合わない ID、空の表示名、登録済みの ID はいずれも { success: false, error } で返す。
 * 既に登録を済ませた人を管理者にする用途には使えない。その場合は利用者一覧から役割を変える。
 */
export async function addAdminDiscordId(discordId: string, label: string) {
  return runAction(async () => {
    const session = await requireAdmin();
    const adminUserId = session.user.id;
    if (!adminUserId) {
      throw new ActionError('認証されていません');
    }

    if (!DISCORD_ID_PATTERN.test(discordId)) {
      throw new ActionError('Discord ID は17桁から20桁の数字で入力してください');
    }

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      throw new ActionError('表示名を入力してください');
    }

    const existing = await db.query.adminDiscordIds.findFirst({
      where: eq(adminDiscordIds.discordId, discordId),
      columns: { discordId: true },
    });
    if (existing) {
      throw new ActionError('この Discord ID は既に登録されています');
    }

    // 一覧への追加は将来の管理者を生む操作で、役割変更と同じ重みがある。記録と同一トランザクションにする
    await db.transaction(async (tx) => {
      await tx.insert(adminDiscordIds).values({
        discordId,
        label: trimmedLabel,
        createdBy: adminUserId,
      });
      await logAdminAction(tx, session.user, {
        action: 'admin_discord_id.add',
        targetId: discordId,
        detail: { label: trimmedLabel },
      });
    });

    revalidatePath('/admin/users/admins');
  });
}

/**
 * Discord の固有 ID を管理者一覧から外す。既に登録済みの利用者の役割は変わらない。
 * 該当が無くても成功として返す。
 */
export async function removeAdminDiscordId(discordId: string) {
  return runAction(async () => {
    const session = await requireAdmin();

    await db.transaction(async (tx) => {
      const removed = await tx
        .delete(adminDiscordIds)
        .where(eq(adminDiscordIds.discordId, discordId))
        .returning({ label: adminDiscordIds.label });

      // 該当が無ければ状態は変わらないので記録しない
      if (removed.length === 0) return;

      await logAdminAction(tx, session.user, {
        action: 'admin_discord_id.remove',
        targetId: discordId,
        detail: { label: removed[0]?.label ?? null },
      });
    });

    revalidatePath('/admin/users/admins');
  });
}
