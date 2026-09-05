export type WinOddsMap = Record<string, number>;

export type PlaceOddsMap = Record<
  string,
  {
    min: number;
    max: number;
  }
>;

export interface RaceOddsData {
  winOdds: WinOddsMap;
  // 馬番→人気順。賭け金額から算出し、未購入の馬番は含まれない
  winPopularity?: Record<string, number> | null;
  placeOdds: PlaceOddsMap;
  updatedAt: Date | string;
}

export interface RaceResultItem {
  finishPosition: number;
  horseNumber: number;
  bracketNumber: number;
  horseName: string;
}

export type RankingMode = 'HIDDEN' | 'ANONYMOUS' | 'FULL' | 'FULL_WITH_LOAN';

export interface SSEConnectedMessage {
  type: 'connected';
  id: string;
}

export interface SSERaceFinalizedMessage {
  type: 'RACE_FINALIZED';
  raceId: string;
}

export interface SSERaceBroadcastMessage {
  type: 'RACE_BROADCAST';
  raceId: string;
}

export interface SSERaceClosedMessage {
  type: 'RACE_CLOSED';
  raceId: string;
}

export interface SSERaceReopenedMessage {
  type: 'RACE_REOPENED';
  raceId: string;
  // 再開と同時にタイマーが設定された場合の締切時刻。手動再開では null
  closingAt: string | null;
}

export interface SSERaceTimerSetMessage {
  type: 'RACE_TIMER_SET';
  raceId: string;
  closingAt: string;
}

export interface SSERaceOddsUpdatedMessage {
  type: 'RACE_ODDS_UPDATED';
  raceId: string;
  data: RaceOddsData;
}

export interface SSERankingUpdatedMessage {
  type: 'RANKING_UPDATED';
  eventId: string;
  mode: RankingMode;
}

export interface SSERaceResultUpdatedMessage {
  type: 'RACE_RESULT_UPDATED';
  raceId: string;
  results: RaceResultItem[];
  timestamp: number;
}

// レース単位の変更は raceId のみ、イベントデフォルトの変更は eventId のみが入る
export interface SSEBetRestrictionUpdatedMessage {
  type: 'BET_RESTRICTION_UPDATED';
  raceId?: string;
  eventId?: string;
}

export type RaceStatusSSEMessage =
  | SSEConnectedMessage
  | SSERaceFinalizedMessage
  | SSERaceBroadcastMessage
  | SSERaceClosedMessage
  | SSERaceReopenedMessage
  | SSERaceTimerSetMessage
  | SSERaceOddsUpdatedMessage
  | SSERankingUpdatedMessage
  | SSERaceResultUpdatedMessage
  | SSEBetRestrictionUpdatedMessage;
