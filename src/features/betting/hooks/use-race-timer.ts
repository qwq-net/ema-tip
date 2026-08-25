import { useEffect, useState } from 'react';

interface UseRaceTimerProps {
  initialStatus: string;
  closingAt: string | null;
}

/**
 * 締切時刻のカウントダウンで受付終了状態を管理する。
 * SSEによる締切・再開の反映は useRaceEvents 側のコールバックから setIsClosed で行う。
 */
export function useRaceTimer({ initialStatus, closingAt }: UseRaceTimerProps) {
  const [isClosed, setIsClosed] = useState(initialStatus !== 'SCHEDULED');

  useEffect(() => {
    if (!closingAt || isClosed) return;

    const updateTimer = () => {
      const now = new Date();
      const closing = new Date(closingAt);
      const diff = closing.getTime() - now.getTime();

      if (diff <= 0) {
        setIsClosed(true);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [closingAt, isClosed]);

  return { isClosed, setIsClosed };
}
