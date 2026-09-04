'use client';

import { ConnectionStatus } from '@/shared/hooks/use-sse';
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
      <div className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
      </div>
      {showText && <span className="text-sm font-semibold text-green-500">LIVE</span>}
    </div>
  );
}
