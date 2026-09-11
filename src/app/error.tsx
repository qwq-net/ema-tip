'use client';

import { ErrorView } from '@/shared/ui/layout/error-view';

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView onRetry={reset} digest={error.digest} />;
}
