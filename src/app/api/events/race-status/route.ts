import { auth } from '@/shared/config/auth';
import { RACE_EVENTS, raceEventEmitter, type RaceEventPayload } from '@/shared/lib/sse/event-emitter';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// 開発時のホットリロードで旧モジュールのリスナーが残るため、既定の上限 10 では警告が出る
raceEventEmitter.setMaxListeners(0);

const encoder = new TextEncoder();

// クライアントは data 部が ': ping' の行を心拍として扱う。この文言を変えると再接続の判定が壊れる
const HEARTBEAT_FRAME = encoder.encode('data: : ping\n\n');

// 接続中のストリームへ 1 フレームを書く関数の集合。配信のたびに全員へ同じチャンクを渡す
const subscribers = new Set<(chunk: Uint8Array) => void>();

let isListening = false;

/**
 * レースイベントを SSE フレームへ変換して全接続へ配信するリスナーを、最初の接続時に一度だけ張る。
 * 直列化と符号化は配信 1 回につき 1 度で済ませる。接続ごとに行うと接続数に比例して同じ処理を繰り返す。
 * リスナーは外さない。emitter への購読は Redis 接続を伴うため、接続の増減で張り直さない
 */
function startBroadcast(): void {
  if (isListening) return;
  isListening = true;

  for (const type of Object.values(RACE_EVENTS)) {
    raceEventEmitter.on(type, (data: RaceEventPayload) => {
      const chunk = encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`);
      for (const send of subscribers) {
        send(chunk);
      }
    });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const customReadable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: {"type":"connected","id":"${raceEventEmitter.id}"}\n\n`));

      let closed = false;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeatInterval);
        subscribers.delete(send);
        try {
          controller.close();
        } catch {
          // クライアント切断と同時に close 済みの場合がある
        }
      };

      // リスナーは emit 元のサーバーアクション内で同期実行されるため、
      // close 済み controller への enqueue 例外を emit 元へ伝播させてはいけない
      function send(chunk: Uint8Array) {
        try {
          controller.enqueue(chunk);
        } catch {
          cleanup();
        }
      }

      subscribers.add(send);
      startBroadcast();

      const heartbeatInterval = setInterval(() => {
        send(HEARTBEAT_FRAME);
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
