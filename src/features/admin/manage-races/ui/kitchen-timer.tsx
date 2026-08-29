'use client';

import { Button } from '@/shared/ui';
import { Clock, Loader2, Timer, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { closeRace, setClosingTime } from '../actions/update';

const emptySubscribe = () => () => {};

interface KitchenTimerProps {
  raceId: string;
  initialClosingAt: Date | null;
  status: string;
}

export function KitchenTimer({ raceId, initialClosingAt, status }: KitchenTimerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [closingAt, setClosingAt] = useState<Date | null>(initialClosingAt);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  // 残り時間はクライアントでしか計算できないため、ハイドレーション完了までスピナーを表示する
  const isInitialized = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // 親から新しい締切時刻が渡されたらレンダー中にローカル状態を同期する
  const [prevInitialClosingAt, setPrevInitialClosingAt] = useState(initialClosingAt);
  if (prevInitialClosingAt?.getTime() !== initialClosingAt?.getTime()) {
    setPrevInitialClosingAt(initialClosingAt);
    setClosingAt(initialClosingAt);
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen]);

  const handleAutoClose = useCallback(async () => {
    try {
      await closeRace(raceId);
      toast.success('タイマーによりレースを締め切りました');
    } catch (error) {
      console.error('Failed to auto-close race', error);
    }
  }, [raceId]);

  useEffect(() => {
    if (!closingAt || status !== 'SCHEDULED') {
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, closingAt.getTime() - now);
      setTimeLeft(diff);
      if (diff === 0) {
        handleAutoClose();
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [closingAt, status, handleAutoClose]);

  const handleSetTimer = async (minutes: number) => {
    try {
      const result = await setClosingTime(raceId, minutes);
      if (result.success) {
        setClosingAt(new Date(result.closingAt));
        toast.success(`${minutes}分後の締切を設定しました`);
        setIsOpen(false);
      }
    } catch {
      toast.error('タイマーの設定に失敗しました');
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (status !== 'SCHEDULED') return null;

  // 締切未設定時は過去のカウントダウン値を表示しない
  const shownTimeLeft = closingAt ? timeLeft : null;

  if (!isInitialized) {
    return (
      <div className="flex h-10 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all hover:scale-105 active:scale-95 ${
          shownTimeLeft && shownTimeLeft > 0
            ? 'animate-pulse border-orange-200 bg-orange-50 text-orange-600 shadow-sm shadow-orange-100'
            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
        }`}
      >
        <Clock className={`h-4 w-4 ${shownTimeLeft && shownTimeLeft > 0 ? 'animate-spin-slow' : ''}`} />
        {shownTimeLeft && shownTimeLeft > 0 ? (
          <span className="tabular-nums">{formatTime(shownTimeLeft)}</span>
        ) : (
          '自動タイマー設定'
        )}
      </button>

      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 absolute top-full left-1/2 z-50 mt-2 min-w-[200px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Timer className="text-primary h-4 w-4" />
              タイマー
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[1, 5, 10, 15, 30, 60].map((mins) => (
              <Button
                key={mins}
                variant="outline"
                size="sm"
                className="h-8 text-sm font-semibold"
                onClick={() => handleSetTimer(mins)}
              >
                +{mins}分
              </Button>
            ))}
          </div>

          <div className="mt-3 border-t border-gray-100 pt-2 text-center">
            <p className="text-sm leading-tight text-gray-400">
              設定すると締切時刻が上書きされます。
              <br />
              0になると自動的に締切処理が走ります。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
