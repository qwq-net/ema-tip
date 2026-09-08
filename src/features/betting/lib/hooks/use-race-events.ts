import type { SSEMessage } from '@/shared/hooks/use-sse';
import { useSSE } from '@/shared/hooks/use-sse';
import type { RaceResultItem, SSERaceOddsUpdatedMessage } from '@/shared/lib/sse/types';
import { toast } from '@/shared/lib/toast';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

const noop = () => undefined;

/** メッセージが対象レース宛てかどうか。raceId を持たない種別は常に false */
function isForRace(data: SSEMessage, raceId: string): boolean {
  return 'raceId' in data && data.raceId === raceId;
}

interface RaceMessageHandlers {
  onRaceBroadcast: () => void;
  onRaceOddsUpdated: (data: SSERaceOddsUpdatedMessage) => void;
  onRaceClosed: () => void;
  onRaceReopened: (closingAt: string | null) => void;
  onRaceTimerSet: (closingAt: string) => void;
  onRaceResultUpdated: (results: RaceResultItem[]) => void;
  refresh: () => void;
}

/** 対象レース宛てと判定済みのメッセージを種別ごとに配る。トーストの文言もここが単一の管理点 */
function dispatchRaceMessage(data: SSEMessage, handlers: RaceMessageHandlers): void {
  switch (data.type) {
    case 'RACE_BROADCAST':
      toast.success('レース結果が発表されました！');
      handlers.onRaceBroadcast();
      handlers.refresh();
      break;
    case 'RACE_ODDS_UPDATED':
      handlers.onRaceOddsUpdated(data);
      break;
    case 'RACE_CLOSED':
      toast.info('投票が締め切られました');
      handlers.onRaceClosed();
      handlers.refresh();
      break;
    case 'RACE_REOPENED':
      toast.info('投票受付が再開されました');
      handlers.onRaceReopened(data.closingAt ?? null);
      handlers.refresh();
      break;
    case 'RACE_TIMER_SET':
      toast.info('受付時間が設定されました');
      handlers.onRaceTimerSet(data.closingAt);
      handlers.refresh();
      break;
    case 'RACE_RESULT_UPDATED':
      if (data.results.length > 0) {
        toast.success('着順が確定しました');
      } else {
        toast.info('着順がリセットされました');
      }
      handlers.onRaceResultUpdated(data.results);
      break;
    case 'BET_RESTRICTION_UPDATED':
      toast.info('購入できる馬券種別が変更されました');
      handlers.refresh();
      break;
    case 'RACE_FINALIZED':
    case 'RANKING_UPDATED':
    case 'connected':
      // connected は useSSE が先に返すためここへ来ない。残りはこのフックの利用者が購読していない。
      // 列挙しておくことで、メッセージ種別が増えたときに分岐漏れを検出できる
      break;
  }
}

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
      if (!isForRace(data, raceId)) return;

      dispatchRaceMessage(data, {
        onRaceBroadcast,
        onRaceOddsUpdated,
        onRaceClosed,
        onRaceReopened,
        onRaceTimerSet,
        onRaceResultUpdated,
        refresh: () => {
          router.refresh();
        },
      });
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
