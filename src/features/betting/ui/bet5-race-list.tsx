'use client';

import { Badge } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';

/** 行の左側に出す最小のレース情報。出走頭数は entries の ENTRANT を数えて求める。 */
interface Bet5ListRace {
  id: string;
  raceNumber: number | null;
  name: string;
  surface: string;
  distance: number;
  entries: { status: string }[];
}

/** 読み取り専用の行が追加で必要とする情報。締切状態と 1 着馬を右端へ出すために使う。 */
interface Bet5ResultRace extends Bet5ListRace {
  status: string;
  entries: { status: string; horseNumber: number | null; finishPosition: number | null; horse: { name: string } }[];
}

type Bet5RaceListProps =
  | {
      races: Bet5ListRace[];
      activeIndex: number;
      selectionCounts: number[];
      onSelect: (index: number) => void;
      readOnly?: false;
    }
  | { races: Bet5ResultRace[]; readOnly: true };

const ROW_CLASS = 'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm';

/** 行の左側。第N戦・レース番号・レース名・距離と頭数のメタを並べる。 */
function RaceRowBody({ index, race }: { index: number; race: Bet5ListRace }) {
  return (
    <>
      <span className="text-text-sub shrink-0 text-sm">第{index + 1}戦</span>
      <span className="shrink-0 font-semibold text-gray-700">{race.raceNumber}R</span>
      <span className="min-w-0 flex-1">
        <span className="text-text-main block truncate font-semibold">{race.name}</span>
        <span className="text-text-sub block text-sm">
          {race.surface}
          {race.distance}m・{race.entries.filter((entry) => entry.status === 'ENTRANT').length}頭
        </span>
      </span>
    </>
  );
}

/**
 * 読み取り専用の行の右端。着順確定済みなら 1 着馬を、まだなら受付状態のバッジを返す。
 * 1 着が入っていれば受付終了は自明なので、バッジではなく結果を優先して出す。
 */
function RaceRowResult({ race }: { race: Bet5ResultRace }) {
  const winner = race.status === 'FINALIZED' ? race.entries.find((entry) => entry.finishPosition === 1) : undefined;

  if (winner) {
    return (
      <span className="text-text-main ml-auto shrink-0 text-sm font-semibold">
        1着 {winner.horseNumber ?? '-'}番 {winner.horse.name}
      </span>
    );
  }

  return (
    <Badge variant="status" label={race.status === 'SCHEDULED' ? '受付中' : '受付終了'} className="ml-auto shrink-0" />
  );
}

/**
 * BET5 の対象 5 レースを 1 行ずつ並べる一覧。
 * 既定では行を押して投票対象のレースを切り替え、右端に選択頭数を出す。
 * selectionCounts は races と同じ並びで渡す前提。
 * readOnly では行を押せなくし、右端をレースの受付状態か確定した 1 着馬に差し替える。
 */
export function Bet5RaceList(props: Bet5RaceListProps) {
  return (
    <div className="rounded-surface divide-y divide-gray-100 overflow-hidden border border-gray-200 bg-white">
      {props.readOnly
        ? props.races.map((race, index) => (
            <div key={race.id} className={ROW_CLASS}>
              <RaceRowBody index={index} race={race} />
              <RaceRowResult race={race} />
            </div>
          ))
        : props.races.map((race, index) => {
            const selectionCount = props.selectionCounts[index] ?? 0;
            return (
              <button
                key={race.id}
                type="button"
                onClick={() => props.onSelect(index)}
                aria-pressed={index === props.activeIndex}
                className={cn(
                  ROW_CLASS,
                  'transition-colors hover:bg-gray-50',
                  index === props.activeIndex && 'bg-turf-50/70'
                )}
              >
                <RaceRowBody index={index} race={race} />
                <span
                  className={cn(
                    'ml-auto shrink-0 text-sm font-semibold',
                    selectionCount > 0 ? 'text-turf-700' : 'text-text-sub'
                  )}
                >
                  {selectionCount > 0 ? `${selectionCount}頭選択` : '未選択'}
                </span>
              </button>
            );
          })}
    </div>
  );
}
