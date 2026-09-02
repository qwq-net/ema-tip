import { SSEMessage, useSSE } from '@/shared/hooks/use-sse';
import type { RaceResultItem, SSERaceOddsUpdatedMessage } from '@/shared/lib/sse/types';
import { toast } from '@/shared/lib/toast';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

interface UseRaceEventsProps {
  raceId: string;
  // 所属イベントのデフォルト設定変更を受け取るために使う。省略時はレース単位の変更のみ拾う
  eventId?: string;
  isFinalized: boolean;
  onRaceBroadcast?: () => void;
  onRaceOddsUpdated?: (data: SSERaceOddsUpdatedMessage) => void;
  onRaceClosed?: () => void;
  onRaceReopened?: (closingAt: string | null) => void;
  onRaceTimerSet?: (closingAt: string) => void;
  onRaceResultUpdated?: (results: RaceResultItem[]) => void;
}

export function useRaceEvents({
  raceId,
  eventId,
  isFinalized,
  onRaceBroadcast,
  onRaceOddsUpdated,
  onRaceClosed,
  onRaceReopened,
  onRaceTimerSet,
  onRaceResultUpdated,
}: UseRaceEventsProps) {
  const router = useRouter();

  const handleMessage = useCallback(
    (data: SSEMessage) => {
      if (data.type === 'RACE_BROADCAST' && data.raceId === raceId) {
        toast.success('レース結果が発表されました！');
        onRaceBroadcast?.();
        router.refresh();
      }

      if (data.type === 'RACE_ODDS_UPDATED' && data.raceId === raceId) {
        onRaceOddsUpdated?.(data);
      }

      if (data.type === 'RACE_CLOSED' && data.raceId === raceId) {
        toast.info('投票が締め切られました');
        onRaceClosed?.();
        router.refresh();
      }

      if (data.type === 'RACE_REOPENED' && data.raceId === raceId) {
        toast.info('投票受付が再開されました');
        onRaceReopened?.(data.closingAt ?? null);
        router.refresh();
      }

      if (data.type === 'RACE_TIMER_SET' && data.raceId === raceId) {
        toast.info('受付時間が設定されました');
        onRaceTimerSet?.(data.closingAt);
        router.refresh();
      }

      if (
        data.type === 'BET_RESTRICTION_UPDATED' &&
        (data.raceId === raceId || (eventId && data.eventId === eventId))
      ) {
        toast.info('購入できる馬券種別が変更されました');
        router.refresh();
      }

      if (data.type === 'RACE_RESULT_UPDATED' && data.raceId === raceId) {
        const results = data.results;
        if (results.length > 0) {
          toast.success('着順が確定しました');
        } else {
          toast.info('着順がリセットされました');
        }
        onRaceResultUpdated?.(results);
      }
    },
    [
      raceId,
      eventId,
      onRaceBroadcast,
      router,
      onRaceOddsUpdated,
      onRaceClosed,
      onRaceReopened,
      onRaceTimerSet,
      onRaceResultUpdated,
    ]
  );

  const { connectionStatus } = useSSE({
    url: '/api/events/race-status',
    onMessage: handleMessage,
    disabled: isFinalized,
  });

  return { connectionStatus };
}
