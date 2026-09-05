import type { BetType } from '@/entities/bet';

export interface ScrapedHorse {
  horseNumber: number;
  // 枠番は出馬表から読めないことがある。未確定は null で持ち、0 をセンチネルに使わない
  bracketNumber: number | null;
  name: string;
  gender: 'HORSE' | 'MARE' | 'GELDING';
  age: number | null;
  jockey: string | null;
  weight: number | null;
  odds: number | null;
  scratched: boolean;
}

export interface ScrapedRaceInfo {
  raceName: string;
  distance: number;
  surface: '芝' | 'ダート';
  direction: 'RIGHT' | 'LEFT' | null;
  condition: '良' | '稍重' | '重' | '不良' | null;
  raceNumber: number;
  netkeibaVenueCode: string;
}

export interface RacePreviewData {
  raceInfo: ScrapedRaceInfo;
  horses: ScrapedHorse[];
  sourceUrl: string;
}

export type HorsePreviewItem = ScrapedHorse & {
  existingHorseId: string | null;
};

export interface RacePreviewWithHorseStatus {
  raceInfo: ScrapedRaceInfo;
  horses: HorsePreviewItem[];
  sourceUrl: string;
}

export interface NetkeibaPayoutEntry {
  numbers: number[];
  payout: number;
}

export interface NetkeibaRaceResult {
  finishOrder: number[];
  payouts: Partial<Record<BetType, NetkeibaPayoutEntry[]>>;
}
