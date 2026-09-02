import { SSEMessage, useSSE } from '@/shared/hooks/use-sse';
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
          toast.info('ランキングが更新されました（匿名公開）');
        } else if (mode === 'FULL_WITH_LOAN') {
          toast.success('ランキングが公開されました（借金込み）');
        } else {
          toast.success('ランキングが公開されました！');
        }

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
