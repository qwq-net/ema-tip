import type { RaceStatusSSEMessage } from '@/shared/lib/sse/types';
import { useEffect, useRef, useState } from 'react';

export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'DISABLED';

export type SSEMessage = RaceStatusSSEMessage;

interface UseSSEProps {
  url: string;
  onMessage?: (data: SSEMessage) => void;
  disabled?: boolean;
}

export function useSSE({ url, onMessage, disabled = false }: UseSSEProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(disabled ? 'DISABLED' : 'CONNECTING');

  // onMessage の参照が変わるたびに再接続しないよう、ref経由で最新のハンドラを呼ぶ
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (disabled) return;

    let eventSource: EventSource | null = null;
    let heartbeatTimeout: NodeJS.Timeout;
    let reconnectTimeout: NodeJS.Timeout;
    // アンマウント後に再接続タイマーが発火すると誰もcloseできない接続が残るため、破棄済みフラグで止める
    let disposed = false;

    const connectSSE = () => {
      if (disposed) return;
      setConnectionStatus('CONNECTING');
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setConnectionStatus('CONNECTED');

        resetHeartbeat();
      };

      eventSource.onmessage = (event) => {
        if (event.data === ': ping') {
          resetHeartbeat();
          return;
        }

        try {
          const data: SSEMessage = JSON.parse(event.data);
          if (data.type === 'connected') return;

          onMessageRef.current?.(data);
        } catch (error) {
          console.error('[SSE] Parse Error', error);
        }
      };

      eventSource.onerror = (err) => {
        console.error('[SSE] Error', err);
        setConnectionStatus('DISCONNECTED');
        eventSource?.close();
        clearTimeout(heartbeatTimeout);
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    };

    const resetHeartbeat = () => {
      clearTimeout(heartbeatTimeout);
      heartbeatTimeout = setTimeout(() => {
        console.warn('[SSE] Heartbeat timeout');
        setConnectionStatus('DISCONNECTED');
        eventSource?.close();
        connectSSE();
      }, 40000);
    };

    connectSSE();

    return () => {
      disposed = true;
      eventSource?.close();
      clearTimeout(heartbeatTimeout);
      clearTimeout(reconnectTimeout);
      setConnectionStatus('DISCONNECTED');
    };
  }, [url, disabled]);

  return { connectionStatus };
}
