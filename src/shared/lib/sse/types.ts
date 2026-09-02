export type WinOddsMap = Record<string, number>;

export type PlaceOddsMap = Record<
  string,
  {
    min: number;
    max: number;
  }
>;

export type RaceOddsData = {
  winOdds: WinOddsMap;
  placeOdds: PlaceOddsMap;
  updatedAt: Date | string;
};

export type RaceResultItem = {
  finishPosition: number;
  horseNumber: number;
  bracketNumber: number;
  horseName: string;
};

export type RankingMode = 'HIDDEN' | 'ANONYMOUS' | 'FULL' | 'FULL_WITH_LOAN';

export type SSEConnectedMessage = {
  type: 'connected';
  id: string;
};

export type SSERaceFinalizedMessage = {
  type: 'RACE_FINALIZED';
  raceId: string;
};

export type SSERaceBroadcastMessage = {
  type: 'RACE_BROADCAST';
  raceId: string;
};

export type SSERaceClosedMessage = {
  type: 'RACE_CLOSED';
  raceId: string;
};

export type SSERaceReopenedMessage = {
  type: 'RACE_REOPENED';
  raceId: string;
  // 再開と同時にタイマーが設定された場合の締切時刻。手動再開では null
  closingAt: string | null;
};

export type SSERaceTimerSetMessage = {
  type: 'RACE_TIMER_SET';
  raceId: string;
  closingAt: string;
};

export type SSERaceOddsUpdatedMessage = {
  type: 'RACE_ODDS_UPDATED';
  raceId: string;
  data: RaceOddsData;
};

export type SSERankingUpdatedMessage = {
  type: 'RANKING_UPDATED';
  eventId: string;
  mode: RankingMode;
};

export type SSERaceResultUpdatedMessage = {
  type: 'RACE_RESULT_UPDATED';
  raceId: string;
  results: RaceResultItem[];
  timestamp: number;
};

// レース単位の変更は raceId のみ、イベントデフォルトの変更は eventId のみが入る
export type SSEBetRestrictionUpdatedMessage = {
  type: 'BET_RESTRICTION_UPDATED';
  raceId?: string;
  eventId?: string;
};

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
