'use client';

import { Button } from '@/shared/ui/button';
import { TriangleAlert } from 'lucide-react';

interface ErrorViewProps {
  /** 再描画を試みる。Next.js のエラー境界から渡される reset をそのまま繋ぐ */
  onRetry: () => void;
}

/**
 * 想定外の例外で画面が描けなかったときの本体。原因は利用者に見せず、やり直しの導線だけ出す。
 * 原因の記録と通知はサーバー側の instrumentation が行うため、ここでは何も送らない。
 */
export function ErrorView({ onRetry }: ErrorViewProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="bg-error/10 flex h-20 w-20 items-center justify-center rounded-full">
          <TriangleAlert className="text-error h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-text-main text-2xl font-semibold">画面を表示できませんでした</h1>
          <p className="text-text-sub text-sm">
            一時的な不具合の可能性があります。やり直しても直らない場合は運営へお知らせください。
          </p>
        </div>
        <Button onClick={onRetry} variant="primary">
          やり直す
        </Button>
      </div>
    </div>
  );
}
