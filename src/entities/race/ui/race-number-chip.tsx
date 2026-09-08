/**
 * レース番号のチップ。「3R」の形で番号を枠に収める。
 * 番号を持たないレースは「-R」と表示する。チップごと省きたい呼び手は自身で描画を止める。
 */
export function RaceNumberChip({ raceNumber }: { raceNumber: number | null }) {
  return (
    <span className="rounded-chip flex h-5 w-7 items-center justify-center bg-gray-100 text-sm font-semibold text-gray-600">
      {raceNumber ?? '-'}R
    </span>
  );
}
