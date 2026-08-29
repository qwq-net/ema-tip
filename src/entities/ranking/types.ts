export interface RankingData {
  rank: number | string;
  userId: string;
  name: string;
  balance: number | '???';
  isCurrentUser: boolean;
  totalLoaned?: number;
}
