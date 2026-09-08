// 取引種別の表示名の単一管理点。キーは transactionTypeEnum の値に一致させること。
// サーバーとクライアントの両方から読むため 'use client' のファイルに置かない。
// クライアント側のファイルに置くと Next.js がクライアント参照へ差し替え、サーバーではキー 0 個になる。
// 通常馬券は「購入」、取消馬による REFUND は的中の払戻と区別して「返還」と表示する
export const TRANSACTION_TYPE_LABELS = {
  DISTRIBUTION: '配布金',
  BET: '購入',
  PAYOUT: '払戻',
  REFUND: '返還',
  LOAN: '借入金',
} satisfies Record<string, string>;
