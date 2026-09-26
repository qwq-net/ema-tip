'use client';

import type { ConnectionStatus } from '@/shared/hooks/use-sse';
import { cn } from '@/shared/utils/cn';
import { Loader2, WifiOff } from 'lucide-react';

interface LiveConnectionStatusProps {
  status: ConnectionStatus;
  className?: string;
  showText?: boolean;
}

export function LiveConnectionStatus({ status, className, showText = true }: LiveConnectionStatusProps) {
  // 確定済みレース等で意図的に接続していない場合は、切断エラーと紛らわしいため何も表示しない
  if (status === 'DISABLED') {
    return null;
  }

  if (status === 'DISCONNECTED') {
    return (
      <div className={cn('flex items-center gap-2 text-red-500', className)}>
        <WifiOff className="h-4 w-4" />
        {showText && <span className="text-sm font-semibold">OFFLINE</span>}
      </div>
    );
  }

  if (status === 'CONNECTING') {
    return (
      <div className={cn('flex items-center gap-2 text-amber-500', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        {showText && <span className="text-sm font-semibold">CONNECTING...</span>}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="h-3 w-3 rounded-full bg-green-500" aria-hidden="true" />
      {showText && <span className="text-sm font-semibold text-green-500">ONLINE</span>}
    </div>
  );
}

/**
 * 黒地の丸いピルに接続状態を載せた表示。結果待機とランキングで画面右上に固定して使う。
 * fixed を渡すと自分で右上へ固定する。位置はヘッダーの 64px を避けて下にずらし、重なりを防ぐ。
 */
export function LiveStatusPill({
  status,
  className,
  fixed = false,
}: {
  status: ConnectionStatus;
  className?: string;
  fixed?: boolean;
}) {
  if (status === 'DISABLED') return null;
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 shadow-lg backdrop-blur-sm',
        fixed && 'fixed top-20 right-4 z-40',
        className
      )}
    >
      <LiveConnectionStatus status={status} showText={true} className="text-white" />
    </div>
  );
}
