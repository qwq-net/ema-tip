'use client';

import { ErrorView } from '@/shared/ui/layout/error-view';

// root layout ごと描けなかったときの受け皿。layout を置き換えるため html と body を自前で持つ
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ja">
      <body>
        <ErrorView onRetry={reset} />
      </body>
    </html>
  );
}
