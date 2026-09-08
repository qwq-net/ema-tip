import { redis } from '@/shared/lib/redis';
import { EventEmitter } from 'events';
import type Redis from 'ioredis';
import type { RaceOddsData, RaceResultItem } from './types';

const CHANNEL = 'race-events';

interface Envelope {
  type: string;
  payload: RaceEventPayload;
}

/**
 * 全 app プロセスへ届くレースイベントの発行元。app は compose の scale で複数台になる。
 *
 * emit は Redis の race-events チャンネルへ publish するだけで、ローカル配信はしない。
 * 各プロセスは初回の on で購読を始め、message 受信時に EventEmitter の配信へ変換する。
 * 単一プロセスでも同じ経路を通るため、リスナーは emit の完了後に非同期で呼ばれる。
 *
 * モジュール読み込み時には Redis へ接続しない。next build と単体テストは Redis なしで動く。
 * Redis 切断中に emit したイベントは失われる。
 * ponytail: 切断時のローカル配信フォールバックなし。必要なら publish 失敗時に super.emit へ落とす
 */
class RaceEventEmitter extends EventEmitter {
  public id = Math.random().toString(36).substring(7);
  private subscriber: Redis | undefined;

  override emit(type: string, payload: RaceEventPayload): boolean {
    const envelope: Envelope = { type, payload };
    redis.publish(CHANNEL, JSON.stringify(envelope)).catch((cause: unknown) => {
      console.error('[SSE] publish に失敗しました:', cause);
    });
    return true;
  }

  override on(type: string, listener: (payload: RaceEventPayload) => void): this {
    this.subscriber ??= this.subscribe();
    return super.on(type, listener);
  }

  private subscribe(): Redis {
    // 購読モードの接続は他コマンドを受け付けないため、共有クライアントとは別に持つ。
    // 共有クライアントの遅延接続は複製されると購読が始まらないため、複製側だけ即時接続へ上書きする
    const subscriber = redis.duplicate({ lazyConnect: false });
    subscriber.on('error', (cause: unknown) => {
      console.error('[SSE] 購読接続でエラー:', cause);
    });
    subscriber.on('message', (_channel: string, message: string) => {
      // SAFETY: このチャンネルへ書くのは同じコードの emit だけで、中身は Envelope を JSON.stringify した文字列に限られる
      const { type, payload } = JSON.parse(message) as Envelope;
      super.emit(type, payload);
    });
    // 初回接続と再接続の両方で購読する。ioredis の自動再購読は成功済みのチャンネルしか覚えないため、
    // Redis 停止中に初回の subscribe が失敗した場合も復帰時に取り直せるようにする
    subscriber.on('ready', () => {
      subscriber.subscribe(CHANNEL).catch((cause: unknown) => {
        console.error('[SSE] subscribe に失敗しました:', cause);
      });
    });
    return subscriber;
  }
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
 * Redis を往復するため、Date は受け手側では ISO 文字列になっている。
 */
export interface RaceEventPayload {
  raceId?: string;
  eventId?: string;
  timestamp?: number;
  mode?: string;
  // ISO 8601 の締切時刻。null はタイマーなしの受付再開を表す
  closingAt?: string | null;
  data?: RaceOddsData;
  results?: RaceResultItem[];
}

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
