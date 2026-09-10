import { GuaranteedOddsDialog } from '@/features/betting/ui/guaranteed-odds-dialog';
import { StandbyClient } from '@/features/betting/ui/standby-client';
import { RankingButton } from '@/features/ranking/components/ranking-button';
import { type BreadcrumbItem, Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { PageContainer } from '@/shared/ui/layout/page-container';
import type { ComponentProps } from 'react';

/**
 * 結果待機画面の外枠。パンくずと保証オッズ・ランキングの操作を 1 行に並べ、その下に待機本体を置く。
 * guaranteedOdds に null を渡すと保証オッズのボタンを出さない。固定オッズのレースはページ側で null にする。
 * standby は待機本体へそのまま渡す props で、レースと馬券の解決はページ側が済ませている前提。
 */
export function RaceStandby({
  breadcrumbs,
  eventId,
  guaranteedOdds,
  standby,
}: {
  breadcrumbs: BreadcrumbItem[];
  eventId: string;
  guaranteedOdds: Record<string, number> | null;
  standby: ComponentProps<typeof StandbyClient>;
}) {
  return (
    <PageContainer>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumbs items={breadcrumbs} />
        <div className="flex items-center gap-2">
          {guaranteedOdds && <GuaranteedOddsDialog guaranteedOdds={guaranteedOdds} />}
          <RankingButton eventId={eventId} />
        </div>
      </div>

      <StandbyClient {...standby} />
    </PageContainer>
  );
}
