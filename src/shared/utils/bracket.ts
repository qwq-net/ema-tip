/** 1レースに登録できる出走馬の上限。JRA のフルゲートに合わせる。超えると枠番を正しく割り当てられない */
export const MAX_HORSES_PER_RACE = 18;

export const BRACKET_COLORS = [
  'bg-white border-2 border-gray-300 text-black',
  'bg-black text-white',
  'bg-red-600 text-white',
  'bg-blue-600 text-white',
  'bg-yellow-400 text-black',
  'bg-green-600 text-white',
  'bg-orange-500 text-white',
  'bg-pink-400 text-white',
] as const;

export function getBracketColor(bracketNumber: number | null): string {
  if (!bracketNumber || bracketNumber < 1 || bracketNumber > 8) {
    return 'bg-gray-100 text-gray-500';
  }
  return BRACKET_COLORS[bracketNumber - 1];
}

export function calculateBracketNumber(horseNumber: number, totalHorses: number): number {
  if (totalHorses <= 8) return horseNumber;

  if (totalHorses <= 15) {
    const singleBracketsCount = 16 - totalHorses;
    if (horseNumber <= singleBracketsCount) return horseNumber;
    return singleBracketsCount + Math.ceil((horseNumber - singleBracketsCount) / 2);
  }

  if (totalHorses === 16) return Math.ceil(horseNumber / 2);

  if (totalHorses === 17) {
    if (horseNumber <= 14) return Math.ceil(horseNumber / 2);
    return 8;
  }

  if (totalHorses === 18) {
    if (horseNumber <= 12) return Math.ceil(horseNumber / 2);
    if (horseNumber <= 15) return 7;
    return 8;
  }

  return Math.min(horseNumber, 8);
}
