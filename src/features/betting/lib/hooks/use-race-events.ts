import { SSEMessage, useSSE } from '@/shared/hooks/use-sse';
import type { RaceResultItem, SSERaceOddsUpdatedMessage } from '@/shared/lib/sse/types';
import { toast } from '@/shared/lib/toast';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

const noop = () => undefined;

/** メッセージが対象レース宛てかどうか。raceId を持たない種別は常に false */
function isForRace(data: SSEMessage, raceId: string): boolean {
  return 'raceId' in data && data.raceId === raceId;
}

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
  onRaceBroadcast = noop,
  onRaceOddsUpdated = noop,
  onRaceClosed = noop,
  onRaceReopened = noop,
  onRaceTimerSet = noop,
  onRaceResultUpdated = noop,
}: UseRaceEventsProps) {
  const router = useRouter();

  const handleMessage = useCallback(
    (data: SSEMessage) => {
      // 券種制限だけはレース単位とイベントデフォルトの2経路で届くため、レース宛て判定の外で扱う
      if (data.type === 'BET_RESTRICTION_UPDATED') {
        if (isForRace(data, raceId) || (eventId !== undefined && data.eventId === eventId)) {
          toast.info('購入できる馬券種別が変更されました');
          router.refresh();
        }
        return;
      }

      if (!isForRace(data, raceId)) return;

      switch (data.type) {
        case 'RACE_BROADCAST':
          toast.success('レース結果が発表されました！');
          onRaceBroadcast();
          router.refresh();
          break;
        case 'RACE_ODDS_UPDATED':
          onRaceOddsUpdated(data);
          break;
        case 'RACE_CLOSED':
          toast.info('投票が締め切られました');
          onRaceClosed();
          router.refresh();
          break;
        case 'RACE_REOPENED':
          toast.info('投票受付が再開されました');
          onRaceReopened(data.closingAt ?? null);
          router.refresh();
          break;
        case 'RACE_TIMER_SET':
          toast.info('受付時間が設定されました');
          onRaceTimerSet(data.closingAt);
          router.refresh();
          break;
        case 'RACE_RESULT_UPDATED':
          if (data.results.length > 0) {
            toast.success('着順が確定しました');
          } else {
            toast.info('着順がリセットされました');
          }
          onRaceResultUpdated(data.results);
          break;
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
