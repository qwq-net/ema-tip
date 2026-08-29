'use client';

import { useRaceEvents } from '@/features/betting/lib/hooks/use-race-events';
import type { getRaceOdds } from '@/features/betting/logic/odds';
import type { RaceOddsData, SSERaceOddsUpdatedMessage } from '@/shared/lib/sse/types';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

type OddsData = Awaited<ReturnType<typeof getRaceOdds>>;

interface RaceEventCallbacks {
  onRaceBroadcast?: () => void;
  onRaceClosed?: () => void;
  onRaceReopened?: () => void;
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

  const handleOddsUpdated = useCallback(
    (message: SSERaceOddsUpdatedMessage) => {
      if (fixedOddsMode) return;
      setOdds(message.data);
      toast.info('オッズが更新されました');
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
