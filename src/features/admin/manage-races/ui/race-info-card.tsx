import { Badge, Card, CardContent, CardHeader, SectionTitle } from '@/shared/ui';
import { FormattedDate } from '@/shared/ui/formatted-date';
import { Settings2 } from 'lucide-react';

interface RaceInfoCardProps {
  status: string;
  surface: string;
  distance: number;
  condition: string | null;
  finalizedAt: Date | null;
  netkeibaUrl: string | null;
  fixedOddsMode: boolean;
  /** オッズの最終更新時刻。記録が無ければ行ごと出さない。 */
  oddsUpdatedAt: Date | undefined;
}

/**
 * 払戻確定後のレース情報カード。着順確定で編集できなくなった項目を読み取り専用で並べる。
 * 確定前は着順設定フォームが同じ情報を持つため、このカードは確定後だけに置く。
 */
export function RaceInfoCard({
  status,
  surface,
  distance,
  condition,
  finalizedAt,
  netkeibaUrl,
  fixedOddsMode,
  oddsUpdatedAt,
}: RaceInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={Settings2}>レース情報</SectionTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6 text-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <span className="text-text-sub">ステータス</span>
          <Badge variant="status" label={status} />
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <span className="text-text-sub">コース</span>
          <div className="flex items-center gap-2">
            <Badge variant="surface" label={surface} />
            <span className="text-text-main font-semibold">{distance}m</span>
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <span className="text-text-sub">馬場状態</span>
          <Badge variant="condition" label={condition} />
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <span className="text-text-sub">確定日時</span>
          <span className="text-text-main font-semibold">
            {finalizedAt ? (
              <FormattedDate
                date={finalizedAt}
                options={{ month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }}
              />
            ) : (
              '-'
            )}
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <span className="text-text-sub">レース作成方法</span>
          <span className="text-text-main font-semibold">{netkeibaUrl ? 'Netkeibaから' : '手動'}</span>
        </div>
        {fixedOddsMode && (
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-text-sub">オッズ設定</span>
            <span className="font-semibold text-blue-600">固定オッズ</span>
          </div>
        )}
        {oddsUpdatedAt && (
          <div className="flex items-center justify-between pb-2">
            <span className="text-text-sub">オッズ更新</span>
            <span className="text-text-sub text-sm">
              <FormattedDate
                date={oddsUpdatedAt}
                options={{ month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }}
              />
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
