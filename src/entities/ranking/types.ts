export interface RankingData {
  rank: number | string;
  userId: string;
  name: string;
  balance: number | '???';
  isCurrentUser: boolean;
  totalLoaned?: number | undefined;
}

/** イベントのランキング公開範囲。HIDDEN は非公開、ANONYMOUS は名前を伏せる、FULL_WITH_LOAN は借入額も含めて出す。 */
export type RankingDisplayMode = 'HIDDEN' | 'ANONYMOUS' | 'FULL' | 'FULL_WITH_LOAN';
