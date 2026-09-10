import { Bet5MyTicketsDialog } from '@/features/betting/ui/bet5-my-tickets-dialog';
import { Bet5RaceList } from '@/features/betting/ui/bet5-race-list';
import { Bet5VotingForm } from '@/features/betting/ui/bet5-voting-form';
import { LoanBanner } from '@/features/economy/loan/ui/loan-banner';
import { Alert, Badge, Card } from '@/shared/ui';
import { type BreadcrumbItem, Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { PageContainer } from '@/shared/ui/layout/page-container';
import { PageHeader } from '@/shared/ui/layout/page-header';
import { formatYen } from '@/shared/utils/format-yen';
import { AlertCircle } from 'lucide-react';
import type { ComponentProps } from 'react';

/** BET5 の対象レース。投票フォームと読み取り専用の一覧と購入済みダイアログが必要とする項目の合算。 */
interface Bet5Race {
  id: string;
  raceNumber: number | null;
  name: string;
  surface: string;
  distance: number;
  status: string;
  entries: {
    id: string;
    horseNumber: number | null;
    bracketNumber: number | null;
    status: string;
    finishPosition: number | null;
    horse: { id: string; name: string };
  }[];
}

interface Bet5VotingProps {
  breadcrumbs: BreadcrumbItem[];
  eventId: string;
  bet5EventId: string;
  /** 受付中かどうか。対象レースが 1 つでも締め切られていたら false で渡す。 */
  isOpen: boolean;
  /** BET5 自体は受付中だが対象レースの締切で終了した状態。理由の帯を出すかの判定に使う。 */
  closedByRace: boolean;
  pot: number;
  balance: number;
  loan: Omit<ComponentProps<typeof LoanBanner>, 'eventId' | 'balance'>;
  /** race1 から race5 の定義順に並べたレース。表示順と選択スロットはこの順で揃える。 */
  races: Bet5Race[];
  tickets: ComponentProps<typeof Bet5MyTicketsDialog>['tickets'];
}

/**
 * BET5 の投票画面。配当プールと融資の案内を出し、受付中は投票フォーム、
 * 受付終了後は対象レースの一覧を読み取り専用で見せる。
 * 受付可否と配当プールの計算はページ側が済ませたものをそのまま描く。
 */
export function Bet5Voting({
  breadcrumbs,
  eventId,
  bet5EventId,
  isOpen,
  closedByRace,
  pot,
  balance,
  loan,
  races,
  tickets,
}: Bet5VotingProps) {
  return (
    <PageContainer>
      <Breadcrumbs items={breadcrumbs} />
      <PageHeader
        title="BET5 投票"
        actions={
          <>
            <Badge variant="status" label={isOpen ? '受付中' : '受付終了'} />
            <Bet5MyTicketsDialog tickets={tickets} races={races} />
          </>
        }
      />

      <Card className="bg-turf-950 border-0 p-5 text-white">
        <p className="text-turf-100 text-sm">配当プール</p>
        <p className="text-gold text-4xl font-semibold tabular-nums">{formatYen(pot)}</p>
      </Card>

      <LoanBanner eventId={eventId} balance={balance} {...loan} />

      {isOpen ? (
        <Bet5VotingForm eventId={eventId} bet5EventId={bet5EventId} races={races} balance={balance} />
      ) : (
        <div className="space-y-4">
          {closedByRace && (
            <Alert variant="error" icon={AlertCircle}>
              対象レースが既に締め切られているため、BET5の投票受付は終了しました。
            </Alert>
          )}
          <Bet5RaceList races={races} readOnly />
        </div>
      )}
    </PageContainer>
  );
}
