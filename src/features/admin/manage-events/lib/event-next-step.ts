export type EventNextStep = 'start' | 'finish';

interface RaceReadiness {
  status: string;
  entrantCount: number;
}

/**
 * イベントの状態と配下レースから、いま管理者が進めるべき操作を返す。該当がなければ null。
 * 準備中で全レースに出走馬が揃っていれば開始、開催中で全レースの払戻が確定していれば終了を促す。
 * レースが 1 件もないときはどちらも促さない。
 */
export function getEventNextStep(status: string, races: readonly RaceReadiness[]): EventNextStep | null {
  if (races.length === 0) return null;
  if (status === 'SCHEDULED' && races.every((r) => r.entrantCount > 0)) return 'start';
  if (status === 'ACTIVE' && races.every((r) => r.status === 'FINALIZED')) return 'finish';
  return null;
}
