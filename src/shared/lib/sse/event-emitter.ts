import { EventEmitter } from 'events';

class RaceEventEmitter extends EventEmitter {
  public id = Math.random().toString(36).substring(7);
}

declare global {
  // 開発時のホットリロードをまたいで emitter インスタンスを共有するためのキャッシュ

  var __raceEventEmitter: RaceEventEmitter | undefined;
}

export const raceEventEmitter = globalThis.__raceEventEmitter ?? new RaceEventEmitter();
globalThis.__raceEventEmitter = raceEventEmitter;

/**
 * SSE でクライアントへ JSON 配信するイベント内容。イベント種別ごとに使うフィールドが異なる。
 * JSON.stringify で直列化されるため、シリアライズ不能な値を入れないこと。
 */
export type RaceEventPayload = {
  raceId?: string;
  eventId?: string;
  timestamp?: number;
  mode?: string;
  // ISO 8601 の締切時刻。null はタイマーなしの受付再開を表す
  closingAt?: string | null;
  data?: {
    winOdds: Record<string, number>;
    placeOdds: Record<string, { min: number; max: number }>;
    updatedAt: Date;
  };
  results?: {
    finishPosition: number;
    horseNumber: number;
    bracketNumber: number;
    horseName: string;
  }[];
};

export const RACE_EVENTS = {
  RACE_FINALIZED: 'RACE_FINALIZED',
  RACE_BROADCAST: 'RACE_BROADCAST',
  RACE_CLOSED: 'RACE_CLOSED',
  RACE_REOPENED: 'RACE_REOPENED',
  RACE_TIMER_SET: 'RACE_TIMER_SET',
  RACE_ODDS_UPDATED: 'RACE_ODDS_UPDATED',
  RANKING_UPDATED: 'RANKING_UPDATED',
  RACE_RESULT_UPDATED: 'RACE_RESULT_UPDATED',
  BET_RESTRICTION_UPDATED: 'BET_RESTRICTION_UPDATED',
} as const;
