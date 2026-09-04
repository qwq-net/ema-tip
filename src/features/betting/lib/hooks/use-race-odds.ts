'use client';

import { useRaceEvents } from '@/features/betting/lib/hooks/use-race-events';
import type { getRaceOdds } from '@/features/betting/logic/odds';
import type { RaceOddsData, SSERaceOddsUpdatedMessage } from '@/shared/lib/sse/types';
import { useCallback, useRef, useState } from 'react';

type OddsData = Awaited<ReturnType<typeof getRaceOdds>>;

interface RaceEventCallbacks {
  // 所属イベント単位の SSE を受け取るための id。useRaceEvents へそのまま渡る
  eventId?: string;
  onRaceBroadcast?: () => void;
  onRaceClosed?: () => void;
  onRaceReopened?: (closingAt: string | null) => void;
  onRaceTimerSet?: (closingAt: string) => void;
}

/**
 * SSE経由のオッズ更新を反映した最新オッズを返す。
 * SSE接続はページごとに1本にしたいため、締切・再開などの他イベントも
 * このフックの events コールバック経由で同じ接続から受け取る。
 */
export function useRaceOdds(
  raceId: string,
  initialOdds: OddsData,
  fixedOddsMode: boolean = false,
  events?: RaceEventCallbacks
) {
  const [odds, setOdds] = useState<OddsData | RaceOddsData>(initialOdds);
  // 更新の連番。表示側が key に使い、同方向の連続更新でも点灯アニメーションを最初から再生する
  const [oddsVersion, setOddsVersion] = useState(0);
  // 馬番ごとの前回比。値が変わらなかった馬番は含まれない
  const [oddsDeltas, setOddsDeltas] = useState<Record<string, 'up' | 'down'>>({});
  const prevWinOddsRef = useRef(initialOdds?.winOdds);

  // トーストは出さない。オッズ更新は誰かが購入するたびに全接続へ届くため、開催ピークには
  // 通知が洪水になり、購入者自身にも成功トーストと重なって出る。更新の通知は
  // オッズ値と最終更新時刻の点灯表示が担う
  const handleOddsUpdated = useCallback(
    (message: SSERaceOddsUpdatedMessage) => {
      if (fixedOddsMode) return;
      const prev = prevWinOddsRef.current ?? {};
      const next = message.data.winOdds ?? {};
      const deltas: Record<string, 'up' | 'down'> = {};
      for (const [horseNumber, value] of Object.entries(next)) {
        const before = prev[horseNumber];
        if (before !== undefined && value > before) deltas[horseNumber] = 'up';
        else if (before !== undefined && value < before) deltas[horseNumber] = 'down';
      }
      prevWinOddsRef.current = next;
      setOdds(message.data);
      setOddsDeltas(deltas);
      setOddsVersion((v) => v + 1);
    },
    [fixedOddsMode]
  );

  const { connectionStatus } = useRaceEvents({
    raceId,
    isFinalized: false,
    onRaceOddsUpdated: handleOddsUpdated,
    ...events,
  });

  return { odds, oddsDeltas, oddsVersion, connectionStatus };
}
