export const EVENT_STATUS_LABELS = {
  SCHEDULED: '準備中',
  ACTIVE: '開催中',
  COMPLETED: '終了',
} as const;

export type EventStatus = keyof typeof EVENT_STATUS_LABELS;

export const RACE_STATUS_LABELS = {
  SCHEDULED: '出走前',
  CLOSED: '締切済み',
  RANKING_CONFIRMED: '着順確定',
  FINALIZED: '払戻確定',
} as const;

export type RaceStatus = keyof typeof RACE_STATUS_LABELS;

export const BET5_STATUS_LABELS = {
  SCHEDULED: '受付中',
  CLOSED: '締切済み',
  FINALIZED: '払戻完了',
} as const;

export type Bet5Status = keyof typeof BET5_STATUS_LABELS;
