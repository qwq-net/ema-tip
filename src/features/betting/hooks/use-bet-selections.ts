import type { BetType } from '@/entities/bet';
import { BET_TYPES, calculateBetCount } from '@/entities/bet';
import { getBetTypeColumnCount } from '@/features/betting/model/bet-types';
import { useState } from 'react';

interface Entry {
  bracketNumber: number | null;
  horseNumber: number | null;
  status: string;
}

interface UseBetSelectionsProps {
  entries: Entry[];
  // null は全種別購入可。配列のときは含まれる種別しか選択できない
  allowedBetTypes?: BetType[] | null;
}

export function useBetSelections({ entries, allowedBetTypes }: UseBetSelectionsProps) {
  const [betType, setBetType] = useState<BetType>(allowedBetTypes?.[0] ?? BET_TYPES.WIN);
  const [selections, setSelections] = useState<Set<number>[]>([new Set(), new Set(), new Set()]);
  const [amount, setAmount] = useState<number>(100);
  // ボックス購入モード。ON の間は1回のチェック操作が全列へ同時に入り、
  // 同じ馬を列数分クリックせずにボックスを組める。2列以上の券種でのみ意味を持つ
  const [boxMode, setBoxMode] = useState(false);

  const columnCount = getBetTypeColumnCount(betType);

  // ゾロ目枠連は同枠に2頭以上いることが前提で、取消馬を数えると誤って有効になるため、出走中のみ集計する
  const bracketHorseCount = new Map<number, number>();
  entries.forEach((entry) => {
    const bracket = entry.bracketNumber;
    if (entry.status === 'ENTRANT' && bracket !== null) {
      bracketHorseCount.set(bracket, (bracketHorseCount.get(bracket) ?? 0) + 1);
    }
  });

  // 選択後に取消となった馬や枠を選択状態から取り除く。
  // 表示のチェックだけ消すと、見えない選択が残って購入全体が原因不明のエラーになる
  const selectableNumbers = new Set<number>();
  for (const entry of entries) {
    if (entry.status !== 'ENTRANT') continue;
    const num = betType === BET_TYPES.BRACKET_QUINELLA ? entry.bracketNumber : entry.horseNumber;
    if (num !== null) selectableNumbers.add(num);
  }
  if (selections.some((set) => [...set].some((num) => !selectableNumbers.has(num)))) {
    setSelections(selections.map((set) => new Set([...set].filter((num) => selectableNumbers.has(num)))));
  }

  // 選択中の種別が SSE 経由の制限変更で許可外になった場合、許可済みの先頭種別へ切り替える。
  // 表示だけ無効化すると許可外の選択が残ったまま購入エラーになる
  const [fallbackBetType] = allowedBetTypes ?? [];
  if (fallbackBetType !== undefined && !allowedBetTypes?.includes(betType)) {
    setBetType(fallbackBetType);
    setSelections([new Set(), new Set(), new Set()]);
  }

  const selectionsArray = selections.slice(0, columnCount).map((s) => Array.from(s));
  const betCount = calculateBetCount(selectionsArray, betType, bracketHorseCount);
  const totalAmount = betCount * amount;

  // 券種を切り替えたら選択とボックスモードを初期化する。ボックスを残すと単勝や複勝を経由して
  // 2列以上の券種へ戻ったとき、操作していないのに突然ボックスへ切り替わる
  const handleBetTypeChange = (newType: BetType) => {
    setBetType(newType);
    setSelections([new Set(), new Set(), new Set()]);
    setBoxMode(false);
  };

  // ボックスモード ON かつ複数列の券種では、どの列を操作しても全列を同時に切り替える。
  // 全列に入っている番号は全列から外し、1列でも欠けていれば全列へ入れる
  const handleCheckboxChange = (columnIndex: number, horseNumber: number) => {
    setSelections((prev) => {
      if (boxMode && columnCount > 1) {
        const inAllColumns = prev.slice(0, columnCount).every((set) => set.has(horseNumber));
        return prev.map((set) => {
          const newSet = new Set(set);
          if (inAllColumns) {
            newSet.delete(horseNumber);
          } else {
            newSet.add(horseNumber);
          }
          return newSet;
        });
      }
      const newSelections = [...prev];
      const newSet = new Set(prev[columnIndex]);
      if (newSet.has(horseNumber)) {
        newSet.delete(horseNumber);
      } else {
        newSet.add(horseNumber);
      }
      newSelections[columnIndex] = newSet;
      return newSelections;
    });
  };

  // ボックスモードの切替。ON にした時点の選択は全列の和集合へ揃え、
  // それまで列ごとに入れていた選択がそのままボックスの買い目になるようにする
  const handleBoxModeChange = (enabled: boolean) => {
    setBoxMode(enabled);
    if (enabled) {
      setSelections((prev) => {
        const union = new Set(prev.slice(0, columnCount).flatMap((set) => [...set]));
        return prev.map(() => new Set(union));
      });
    }
  };

  const resetSelections = () => {
    setSelections([new Set(), new Set(), new Set()]);
    setAmount(100);
  };

  return {
    betType,
    selections,
    amount,
    setAmount,
    betCount,
    totalAmount,
    columnCount,
    bracketHorseCount,
    selectionsArray,
    boxMode,
    handleBoxModeChange,
    handleBetTypeChange,
    handleCheckboxChange,
    resetSelections,
  };
}
