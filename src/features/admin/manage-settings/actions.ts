'use server';

import { db } from '@/shared/db';
import { guaranteedOddsMaster } from '@/shared/db/schema';
import { requireAdmin } from '@/shared/utils/admin';
import { revalidatePath } from 'next/cache';

export async function updateSystemDefaultOdds(defaultGuaranteedOdds: Record<string, number>) {
  await requireAdmin();

  const oddsEntries = Object.entries(defaultGuaranteedOdds)
    .filter(([, odds]) => Number.isFinite(odds) && odds >= 0)
    .map(([key, odds]) => ({ key, odds: odds.toString() }));

  // 入力を空にしたキーは payload に含まれない。upsert だけだと旧行が残り「消したのに復活する」ため全置換する
  await db.transaction(async (tx) => {
    await tx.delete(guaranteedOddsMaster);
    if (oddsEntries.length > 0) {
      await tx.insert(guaranteedOddsMaster).values(oddsEntries);
    }
  });

  revalidatePath('/admin/settings/odds');
}
