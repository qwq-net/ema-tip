import type { BetType } from '@/entities/bet';
import { BET_TYPES } from '@/entities/bet';

export function getBetTypeColumnCount(betType: BetType): number {
  switch (betType) {
    case BET_TYPES.WIN:
    case BET_TYPES.PLACE:
      return 1;
    case BET_TYPES.BRACKET_QUINELLA:
    case BET_TYPES.QUINELLA:
    case BET_TYPES.WIDE:
    case BET_TYPES.EXACTA:
      return 2;
    case BET_TYPES.TRIFECTA:
    case BET_TYPES.TRIO:
      return 3;
    default:
      return 1;
  }
}

export function getBetTypeColumnLabels(betType: BetType): string[] {
  switch (betType) {
    case BET_TYPES.WIN:
      return ['1着候補'];
    case BET_TYPES.PLACE:
      return ['3着以内候補'];
    case BET_TYPES.BRACKET_QUINELLA:
      return ['1枠目', '2枠目'];
    case BET_TYPES.QUINELLA:
    case BET_TYPES.WIDE:
      return ['1頭目', '2頭目'];
    case BET_TYPES.EXACTA:
      return ['1着候補', '2着候補'];
    case BET_TYPES.TRIFECTA:
      return ['1着候補', '2着候補', '3着候補'];
    case BET_TYPES.TRIO:
      return ['1頭目', '2頭目', '3頭目'];
    default:
      return ['選択'];
  }
}
