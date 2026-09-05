import type { getWalletTransactions } from '../queries';

type FetchedTransaction = Awaited<ReturnType<typeof getWalletTransactions>>[number];

/**
 * 履歴の説明文づくりに必要な取引の形。
 * 取得クエリの結果をそのまま渡せる部分集合であり、呼び出し時の代入で実データとの整合が検査される。
 */
export interface WalletTransaction {
  type: FetchedTransaction['type'];
  bet: { race: { name: string; venue: { shortName: string } | null } | null } | null;
  event: { name: string } | null;
  bet5Ticket: { bet5Event: { event: { name: string } | null } | null } | null;
}

/**
 * BET5 の取引 1 件の説明文。
 * BET5 は画面全体で「投票」の語に統一している。通常馬券の「購入」と使い分ける。
 * 所属イベント名を辿れないときはイベント名を省いた文言になる。
 */
function describeBet5Transaction(tx: WalletTransaction): string {
  const action = tx.type === 'PAYOUT' ? '払戻' : '投票';
  const bet5EventName = tx.bet5Ticket?.bet5Event?.event?.name;
  return bet5EventName ? `${bet5EventName} BET5 ${action}` : `BET5 ${action}`;
}

/**
 * レース馬券の取引 1 件の説明文。対象レースが辿れなければ null。
 * 競馬場が判る場合だけ略称を前置し、購入と払戻と返還で文言は変えない。
 */
function describeRaceTransaction(tx: WalletTransaction): string | null {
  const raceName = tx.bet?.race?.name;
  if (!raceName) return null;

  const venueShortName = tx.bet?.race?.venue?.shortName;
  return venueShortName ? `${venueShortName} ${raceName}` : raceName;
}

/**
 * 取引種別に応じた履歴の説明文。説明を持たない種別は null。
 * null のとき呼び手は取引種別の表示名へフォールバックする。
 * 購入と払戻は BET5 券が紐づくかどうかで BET5 の文言とレースの文言を出し分ける。
 */
export function describeTransaction(tx: WalletTransaction): string | null {
  switch (tx.type) {
    case 'BET':
    case 'PAYOUT':
      return tx.bet5Ticket ? describeBet5Transaction(tx) : describeRaceTransaction(tx);
    case 'REFUND':
      return describeRaceTransaction(tx);
    case 'DISTRIBUTION':
      return tx.event?.name || '配布金';
    case 'LOAN':
      return tx.event?.name ? `${tx.event.name} 借入金` : '借入金';
  }
}
