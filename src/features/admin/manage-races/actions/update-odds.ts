'use server';

import { guaranteedOddsOverrideSchema } from '@/entities/race/lib/guaranteed-odds';
import { db } from '@/shared/db';
import { raceInstances } from '@/shared/db/schema';
import { ActionError, requireAdmin, revalidateRacePaths, runAction } from '@/shared/utils/admin';
import { eq } from 'drizzle-orm';

// レース単位の保証オッズ上書きを置き換える。載っていない券種はデフォルト設定を使う意味になる。
// 1.1 倍未満や券種以外のキーが含まれていれば何も保存せずエラーを返す
export async function updateGuaranteedOdds(raceId: string, guaranteedOdds: Record<string, number>) {
  return runAction(async () => {
    await requireAdmin();

    const parsed = guaranteedOddsOverrideSchema.safeParse(guaranteedOdds);
    if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? '入力内容が無効です');

    await db.update(raceInstances).set({ guaranteedOdds: parsed.data }).where(eq(raceInstances.id, raceId));

    revalidateRacePaths(raceId);
  });
}
