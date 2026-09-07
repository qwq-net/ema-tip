'use server';

import { defaultGuaranteedOddsSchema } from '@/entities/race/lib/guaranteed-odds';
import { db } from '@/shared/db';
import { guaranteedOddsMaster } from '@/shared/db/schema';
import { ActionError, requireAdmin, runAction } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import { revalidatePath } from 'next/cache';

// システム既定の保証オッズを全券種ぶん置き換える。上書きの無いレースはこの値を参照する。
// 券種の欠けや 1.1 倍未満があれば何も保存せずエラーを返す
export async function updateSystemDefaultOdds(defaultGuaranteedOdds: Record<string, number>) {
  return runAction(async () => {
    const session = await requireAdmin();

    const parsed = defaultGuaranteedOddsSchema.safeParse(defaultGuaranteedOdds);
    if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? '入力内容が無効です');

    const oddsEntries = Object.entries(parsed.data).map(([key, odds]) => ({ key, odds: odds.toString() }));

    await db.transaction(async (tx) => {
      await tx.delete(guaranteedOddsMaster);
      await tx.insert(guaranteedOddsMaster).values(oddsEntries);
    });

    // 全レースの既定値なので対象 id は持たない。system で記録して検索できるようにする
    await logAdminAction(db, session.user, {
      action: 'settings.update_default_guaranteed_odds',
      targetId: 'system',
      detail: parsed.data,
    });

    revalidatePath('/admin/settings/odds');
  });
}
