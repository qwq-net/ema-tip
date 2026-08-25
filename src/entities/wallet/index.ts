export const LOAN_THRESHOLD_RATIO = 0.6;

/** 残高が配布額の一定割合を下回っていて、まだ借入していない場合のみ融資を受けられる。 */
export function isEligibleForLoan(balance: number, distributeAmount: number, hasLoaned: boolean): boolean {
  if (hasLoaned) return false;
  return balance < distributeAmount * LOAN_THRESHOLD_RATIO;
}

/** 表示用の純資産。残高から借入額を差し引いた値を返す。 */
export function calculateNetBalance(balance: number, totalLoaned: number): number {
  return balance - totalLoaned;
}
