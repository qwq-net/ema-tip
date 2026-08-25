import { VENUE_DIRECTIONS } from '@/shared/constants/race';
import { z } from 'zod';

export const raceSchema = z.object({
  eventId: z.string().min(1, 'イベントを選択してください'),
  date: z.string().min(1, '開催日を入力してください'),
  name: z.string().min(1, 'レース名を入力してください'),
  raceNumber: z.coerce.number().optional(),
  distance: z.coerce.number().min(100, '距離は100m以上で入力してください'),
  surface: z.string(),
  condition: z.string().optional(),
  closingAt: z.string().optional(),
  venueId: z.string().min(1, '開催場所を選択してください'),
  raceDefinitionId: z.string().optional(),
  direction: z.enum(VENUE_DIRECTIONS).optional(),
});
