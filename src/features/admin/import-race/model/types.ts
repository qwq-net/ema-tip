export type ScrapedHorse = {
  horseNumber: number;
  bracketNumber: number;
  name: string;
  gender: 'HORSE' | 'MARE' | 'GELDING';
  age: number | null;
  jockey: string | null;
  weight: number | null;
  odds: number | null;
  scratched: boolean;
};

export type ScrapedRaceInfo = {
  raceName: string;
  distance: number;
  surface: string;
  direction: 'RIGHT' | 'LEFT' | null;
  condition: string | null;
  raceNumber: number;
  netkeibaVenueCode: string;
};

export type RacePreviewData = {
  raceInfo: ScrapedRaceInfo;
  horses: ScrapedHorse[];
  sourceUrl: string;
};

export type HorsePreviewItem = ScrapedHorse & {
  existingHorseId: string | null;
};

export type RacePreviewWithHorseStatus = {
  raceInfo: ScrapedRaceInfo;
  horses: HorsePreviewItem[];
  sourceUrl: string;
};


export type NetkeibaPayoutEntry = {
  numbers: number[];
  payout: number;
};

export type NetkeibaRaceResult = {
  finishOrder: number[];
  payouts: Partial<Record<string, NetkeibaPayoutEntry[]>>;
};
