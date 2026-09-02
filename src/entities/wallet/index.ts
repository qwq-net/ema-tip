export const DEFAULT_LOAN_THRESHOLD_PERCENT = 30;

/**
 * 融資対象の判定。残高が配布額の thresholdPercent 割合以下で、まだ借入していないときだけ true。
 * thresholdPercent は 0〜100 の整数で、イベント設定の値を渡す。未指定は既定の30。
 */
export function isEligibleForLoan(
  balance: number,
  distributeAmount: number,
  hasLoaned: boolean,
  thresholdPercent: number = DEFAULT_LOAN_THRESHOLD_PERCENT
): boolean {
  if (hasLoaned) return false;
  return balance <= (distributeAmount * thresholdPercent) / 100;
}

/** 表示用の純資産。残高から借入額を差し引いた値を返す。 */
export function calculateNetBalance(balance: number, totalLoaned: number): number {
  return balance - totalLoaned;
}
