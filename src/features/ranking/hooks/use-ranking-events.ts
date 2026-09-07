import type { SSEMessage } from '@/shared/hooks/use-sse';
import { useSSE } from '@/shared/hooks/use-sse';
import { toast } from '@/shared/lib/toast';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
interface UseRankingEventsProps {
  eventId: string;
}

export function useRankingEvents({ eventId }: UseRankingEventsProps) {
  const router = useRouter();

  const handleMessage = useCallback(
    (data: SSEMessage) => {
      if (data.type === 'RANKING_UPDATED' && data.eventId === eventId) {
        const mode = data.mode;
        if (mode === 'HIDDEN') {
          toast.info('ランキングが非公開になりました');
        } else if (mode === 'ANONYMOUS') {
          toast.info('ランキングが匿名で公開されました');
        } else if (mode === 'FULL_WITH_LOAN') {
          toast.success('ランキングが借金込みで公開されました');
        } else {
          toast.success('ランキングが公開されました！');
        }

        router.refresh();
      }
      // 払戻確定で所持金が動く。開催中に 1 回きりの状態変化なのでトーストは出さず値だけ更新する
      if (data.type === 'RACE_BROADCAST') {
        router.refresh();
      }
    },
    [eventId, router]
  );

  const { connectionStatus } = useSSE({
    url: '/api/events/race-status',
    onMessage: handleMessage,
  });

  return { connectionStatus };
}
