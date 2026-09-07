'use server';

import { guaranteedOddsOverrideSchema } from '@/entities/race/lib/guaranteed-odds';
import { db } from '@/shared/db';
import { payoutResults, raceInstances } from '@/shared/db/schema';
import { ActionError, ADMIN_ERRORS, requireAdmin, revalidateRacePaths, runAction } from '@/shared/utils/admin';
import { logAdminAction } from '@/shared/utils/admin-audit';
import { eq } from 'drizzle-orm';

// レース単位の保証オッズ上書きを置き換える。載っていない券種はデフォルト設定を使う意味になる。
// 1.1 倍未満や券種以外のキーが含まれていれば何も保存せずエラーを返し、レースが無いときも同様に返す。
// 払戻表は着順確定で作られ、以後に保証オッズを変えると計算済みの払戻と食い違うため、着順確定後は拒否する
export async function updateGuaranteedOdds(raceId: string, guaranteedOdds: Record<string, number>) {
  return runAction(async () => {
    const session = await requireAdmin();

    const parsed = guaranteedOddsOverrideSchema.safeParse(guaranteedOdds);
    if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? '入力内容が無効です');

    const [race, payout] = await Promise.all([
      db.query.raceInstances.findFirst({ where: eq(raceInstances.id, raceId), columns: { status: true } }),
      db.query.payoutResults.findFirst({ where: eq(payoutResults.raceId, raceId), columns: { id: true } }),
    ]);
    if (!race) throw new ActionError(ADMIN_ERRORS.NOT_FOUND);
    if (race.status === 'FINALIZED' || payout) {
      throw new ActionError('着順確定済みのレースの保証オッズは変更できません');
    }

    const updated = await db
      .update(raceInstances)
      .set({ guaranteedOdds: parsed.data })
      .where(eq(raceInstances.id, raceId))
      .returning({ id: raceInstances.id });
    if (updated.length === 0) throw new ActionError(ADMIN_ERRORS.NOT_FOUND);

    await logAdminAction(db, session.user, {
      action: 'race.update_guaranteed_odds',
      targetId: raceId,
      detail: parsed.data,
    });

    revalidateRacePaths(raceId);
  });
}
