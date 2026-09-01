import { SSEMessage, useSSE } from '@/shared/hooks/use-sse';
import type { RaceResultItem, SSERaceOddsUpdatedMessage } from '@/shared/lib/sse/types';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';

interface UseRaceEventsProps {
  raceId: string;
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
