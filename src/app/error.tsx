'use client';

import { ErrorView } from '@/shared/ui/layout/error-view';

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView onRetry={reset} />;
}
