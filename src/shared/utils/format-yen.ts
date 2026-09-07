/** 金額を「1,234,567円」の形にする。 */
export function formatYen(value: number): string {
  return `${value.toLocaleString('ja-JP')}円`;
}
