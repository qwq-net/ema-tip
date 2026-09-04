'use client';

import { useRaceEvents } from '@/features/betting/lib/hooks/use-race-events';
import type { getRaceOdds } from '@/features/betting/logic/odds';
import type { RaceOddsData, SSERaceOddsUpdatedMessage } from '@/shared/lib/sse/types';
import { useCallback, useState } from 'react';

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

  // トーストは出さない。オッズ更新は誰かが購入するたびに全接続へ届くため、開催ピークには
  // 通知が洪水になり、購入者自身にも成功トーストと重なって出る。オッズ値と
  // 「オッズ最終更新」時刻の表示がライブで変わることが更新の通知を兼ねる
  const handleOddsUpdated = useCallback(
    (message: SSERaceOddsUpdatedMessage) => {
      if (fixedOddsMode) return;
      setOdds(message.data);
    },
    [fixedOddsMode]
  );

  const { connectionStatus } = useRaceEvents({
    raceId,
    isFinalized: false,
    onRaceOddsUpdated: handleOddsUpdated,
    ...events,
  });

  return { odds, connectionStatus };
}
