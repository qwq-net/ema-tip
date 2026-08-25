'use client';

import { useIsMounted } from '../hooks/use-is-mounted';
import { formatJST } from '../utils/date';

interface FormattedDateProps {
  date: Date | string | null | undefined;
  options?: Intl.DateTimeFormatOptions;
  className?: string;
}

export function FormattedDate({ date, options, className }: FormattedDateProps) {
  const isClient = useIsMounted();

  return <span className={className}>{isClient ? formatJST(date, options) : ''}</span>;
}
