export type AssetHistoryPoint = {
  date: string;
  timestamp: number;
  balance: number;
  label?: string;
  amount: number;
  type?: string;
  eventId?: string;
  raceName?: string;
};

export type TransactionLog = {
  id: string;
  date: string;
  type: string;
  amount: number;
  description: string;
};

export type EventStats = {
  id: string;
  name: string;
  balance: number;
  loan: number;
  net: number;
  history: AssetHistoryPoint[];
  logs: TransactionLog[];
};

export type TransactionWithDetails = {
  type: string;
  bet: {
    race: {
      name: string;
    } | null;
  } | null;
};

export function getActionName(type: string): string {
  switch (type) {
    case 'BET':
      return '投票';
    case 'PAYOUT':
      return '払戻';
    case 'DISTRIBUTION':
      return '初期配布';
    case 'LOAN':
      return '借入';
    default:
      return type;
  }
}

export function getTransactionDescription(tx: TransactionWithDetails): string {
  const raceName = tx.bet?.race?.name;

  if (tx.type === 'BET' && raceName) {
    return `${raceName} 投票`;
  } else if (tx.type === 'PAYOUT' && raceName) {
    return `${raceName} 払戻`;
  } else if (tx.type === 'LOAN') {
    return '借入';
  } else if (tx.type === 'DISTRIBUTION') {
    return '初期配布';
  } else {
    return getActionName(tx.type);
  }
}

const JST_DATE = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
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

// サーバー（コンテナ）は UTC のため、ローカル TZ 依存の date-fns format は使わず JST 固定で整形する
export function formatTransactionDate(date: Date): string {
  return `${JST_DATE.format(date)} ${JST_TIME.format(date)}`;
}

export function formatChartDate(date: Date, global: boolean = false): string {
  return global
    ? `${JST_ISO_DATE.format(date)} ${JST_TIME.format(date)}`
    : `${JST_MONTH_DAY.format(date)} ${JST_TIME.format(date)}`;
}
