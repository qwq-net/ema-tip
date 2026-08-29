import { RaceStatus } from '@/shared/constants/status';

export type DisplayStatus = RaceStatus | 'RANKING_CONFIRMED';

export function getDisplayStatus(status: string, hasRanking: boolean): string {
  if (status === 'CLOSED' && hasRanking) {
    return 'RANKING_CONFIRMED';
  }
  return status;
}
