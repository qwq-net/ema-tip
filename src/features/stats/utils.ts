import { TRANSACTION_TYPE_LABELS } from '@/entities/wallet/constants';
import { type Transaction } from '@/entities/wallet/ui/transaction-list';
import { lookup } from '@/shared/utils/lookup';

export interface AssetHistoryPoint {
  date: string;
  timestamp: number;
  balance: number;
  label?: string;
  amount: number;
  type?: string;
  eventId?: string;
  raceName?: string | undefined;
}

export interface EventStats {
  id: string;
  name: string;
  balance: number;
  loan: number;
  net: number;
  history: AssetHistoryPoint[];
  logs: Transaction[];
}

export interface TransactionWithDetails {
  type: string;
  bet: {
    race: {
      name: string;
    } | null;
  } | null;
}

// 取引種別の表示名は TRANSACTION_TYPE_LABELS を単一管理点とし、未知の種別は生の値をそのまま返す
export function getActionName(type: string): string {
  return lookup(TRANSACTION_TYPE_LABELS, type) ?? type;
}

export function getTransactionDescription(tx: TransactionWithDetails): string {
  const raceName = tx.bet?.race?.name;

  if (raceName && (tx.type === 'BET' || tx.type === 'PAYOUT' || tx.type === 'REFUND')) {
    return `${raceName} ${getActionName(tx.type)}`;
  }
  return getActionName(tx.type);
}

const JST_MONTH_DAY = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit' });
const JST_TIME = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});
const JST_ISO_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// サーバーが動くコンテナは UTC のため、ローカル TZ 依存の date-fns format は使わず JST 固定で整形する
export function formatChartDate(date: Date, global = false): string {
  return global
    ? `${JST_ISO_DATE.format(date)} ${JST_TIME.format(date)}`
    : `${JST_MONTH_DAY.format(date)} ${JST_TIME.format(date)}`;
}
