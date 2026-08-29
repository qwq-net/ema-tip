export const JST_TIMEZONE = 'Asia/Tokyo';

export function parseJSTToUTC(jstString: string | null | undefined): Date | null {
  if (!jstString || !jstString.includes('T')) return null;

  const date = new Date(`${jstString}:00+09:00`);
  return isNaN(date.getTime()) ? null : date;
}

export function formatJST(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat('ja-JP', {
    ...options,
    timeZone: JST_TIMEZONE,
  }).format(d);
}
