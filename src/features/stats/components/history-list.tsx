import { cn } from '@/shared/utils/cn';

interface HistoryLog {
  id: string;
  date: string;
  type: string;
  amount: number;
  description: string;
}

interface HistoryListProps {
  logs: HistoryLog[];
}

const CELL_CLASS = 'p-4 align-middle';

export function HistoryList({ logs }: HistoryListProps) {
  return (
    <div className="rounded-control border">
      <div className="relative w-full overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">日時</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">内容</th>
              <th className="h-12 px-4 text-right align-middle font-medium text-gray-500">金額</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={3} className={cn(CELL_CLASS, 'h-24 text-center')}>
                  履歴がありません
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b transition-colors last:border-0 hover:bg-gray-50">
                  <td className={cn(CELL_CLASS, 'font-mono text-sm whitespace-nowrap')}>{log.date}</td>
                  <td className={CELL_CLASS}>{log.description}</td>
                  <td
                    className={cn(
                      CELL_CLASS,
                      'text-right font-mono',
                      log.amount > 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {log.amount > 0 ? '+' : ''}
                    {log.amount.toLocaleString('ja-JP')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
