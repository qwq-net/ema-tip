// イベント一覧のステータス直下に出す BET5 案内リンク。文言と配色の単一管理点で、慣習色の直書きをこのファイルに閉じる

export interface Bet5GuideEvent {
  status: string;
  bet5Event?:
    | {
        status: string;
        race1?: { status: string } | null;
        race2?: { status: string } | null;
        race3?: { status: string } | null;
        race4?: { status: string } | null;
        race5?: { status: string } | null;
      }
    | null
    | undefined;
}

export type Bet5GuideKind = 'setup' | 'close' | 'payout';

export const BET5_GUIDES = {
  setup: { label: 'BET5を設定できます', className: 'text-blue-700 hover:text-blue-800' },
  close: { label: 'BET5の締切がまだです', className: 'text-amber-700 hover:text-amber-800' },
  payout: { label: 'BET5の払戻がまだです', className: 'text-red-700 hover:text-red-800' },
} satisfies Record<Bet5GuideKind, { label: string; className: string }>;

function areBet5TargetRacesFinished(bet5Event: NonNullable<Bet5GuideEvent['bet5Event']>): boolean {
  return [bet5Event.race1, bet5Event.race2, bet5Event.race3, bet5Event.race4, bet5Event.race5].every(
    (race) => race?.status === 'FINALIZED'
  );
}

/**
 * イベントの BET5 状態から管理者へ案内する導線を選ぶ。案内不要なら null。
 * 開催終了と BET5 払戻済みでは何も案内しない。3 つの状態は同時に成立しないため常に 1 つだけ返る。
 */
export function getBet5Guide(event: Bet5GuideEvent): Bet5GuideKind | null {
  if (event.status === 'COMPLETED' || event.bet5Event?.status === 'FINALIZED') return null;

  if (!event.bet5Event) {
    return event.status === 'SCHEDULED' || event.status === 'ACTIVE' ? 'setup' : null;
  }

  if (event.status !== 'ACTIVE') return null;
  if (event.bet5Event.status === 'SCHEDULED') return 'close';
  if (event.bet5Event.status === 'CLOSED' && areBet5TargetRacesFinished(event.bet5Event)) return 'payout';
  return null;
}
