import { BET_TYPES, BetType, calculateBetCount } from '@/entities/bet';
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

  const columnCount = getBetTypeColumnCount(betType);

  // ゾロ目枠連は同枠に2頭以上いることが前提で、取消馬を数えると誤って有効になるため、出走中のみ集計する
  const bracketHorseCount = new Map<number, number>();
  entries.forEach((entry) => {
    const bracket = entry.bracketNumber;
    if (entry.status === 'ENTRANT' && bracket !== null) {
      bracketHorseCount.set(bracket, (bracketHorseCount.get(bracket) || 0) + 1);
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
  if (allowedBetTypes && !allowedBetTypes.includes(betType)) {
    setBetType(allowedBetTypes[0]);
    setSelections([new Set(), new Set(), new Set()]);
  }

  const selectionsArray = selections.slice(0, columnCount).map((s) => Array.from(s));
  const betCount = calculateBetCount(selectionsArray, betType, bracketHorseCount);
  const totalAmount = betCount * amount;

  const handleBetTypeChange = (newType: BetType) => {
    setBetType(newType);
    setSelections([new Set(), new Set(), new Set()]);
  };

  const handleCheckboxChange = (columnIndex: number, horseNumber: number) => {
    setSelections((prev) => {
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
    handleBetTypeChange,
    handleCheckboxChange,
    resetSelections,
  };
}
