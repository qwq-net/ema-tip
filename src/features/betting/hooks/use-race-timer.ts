import { useEffect, useState } from 'react';

interface UseRaceTimerProps {
  initialStatus: string;
  closingAt: string | null;
}

/**
 * 残りミリ秒を「分:秒」で整形する。1時間以上は「時:分:秒」になる。
 * 0以下は '0:00' を返し、端数ミリ秒は切り捨てる。
 */
export function formatRemainingTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
}

/**
 * 締切時刻のカウントダウンで受付終了状態と残り時間を管理する。
 * closingAt は SSE の RACE_TIMER_SET / RACE_REOPENED を受けた側が setClosingAt で更新する。
 * remainingMs は締切未設定または受付終了時は null。
 */
export function useRaceTimer({ initialStatus, closingAt: initialClosingAt }: UseRaceTimerProps) {
  const [isClosed, setIsClosed] = useState(initialStatus !== 'SCHEDULED');
  const [closingAt, setClosingAt] = useState(initialClosingAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!closingAt || isClosed) return;

    const timer = setInterval(() => {
      setNow(Date.now());
      if (new Date(closingAt).getTime() - Date.now() <= 0) {
        setIsClosed(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [closingAt, isClosed]);

  // state ではなく描画時に導出することで、closingAt 更新時に1秒待たず即時反映される
  const remainingMs = closingAt && !isClosed ? new Date(closingAt).getTime() - now : null;

  return { isClosed, setIsClosed, remainingMs, setClosingAt };
}
