import { auth } from '@/shared/config/auth';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// 1接続あたり7リスナーを登録するため、既定の上限10では数接続で警告が出る
raceEventEmitter.setMaxListeners(0);

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: {"type":"connected","id":"${raceEventEmitter.id}"}\n\n`));

      let closed = false;
      const handlers: Array<[string, (data: object) => void]> = [];

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeatInterval);
        for (const [type, handler] of handlers) {
          raceEventEmitter.off(type, handler);
        }
        try {
          controller.close();
        } catch {
          // クライアント切断と同時に close 済みの場合がある
        }
      };

      // リスナーは emit 元のサーバーアクション内で同期実行されるため、
      // close 済み controller への enqueue 例外を emit 元へ伝播させてはいけない
      const safeEnqueue = (payload: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          cleanup();
        }
      };

      for (const type of Object.values(RACE_EVENTS)) {
        const handler = (data: object) => {
          safeEnqueue(JSON.stringify({ type, ...data }));
        };
        handlers.push([type, handler]);
        raceEventEmitter.on(type, handler);
      }

      const heartbeatInterval = setInterval(() => {
        safeEnqueue(': ping');
      }, 30000);

      req.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
