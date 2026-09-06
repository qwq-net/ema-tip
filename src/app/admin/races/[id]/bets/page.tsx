import { BET_TYPE_LABELS } from '@/entities/bet';
import { getBetsByRace } from '@/features/admin/manage-bets/actions/read';
import { Badge, TableBody, TableEmptyRow, TableHead, TableRow, TableShell, Td, Th } from '@/shared/ui';
import { FormattedDate } from '@/shared/ui/formatted-date';
import { lookup } from '@/shared/utils/lookup';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'レースの馬券',
};

// 馬券状態の日本語ラベル。REFUNDED はラベルを持たず、状態名をそのまま表示する
const BET_STATUS_LABELS = {
  PENDING: '未確定',
  HIT: '的中',
  LOST: '不的中',
} satisfies Record<string, string>;

// 馬券状態のバッジ色。的中だけを緑で強調する。REFUNDED は色を持たず Badge の既定に任せる
const BET_STATUS_CLASSES = {
  HIT: 'bg-green-100 text-green-800',
  LOST: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-gray-100 text-gray-600',
} satisfies Record<string, string>;

/** 集計 1 項目。ラベルと値を縦に並べる。 */
function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

/** レースに購入された馬券の一覧。レース自体の存在確認と見出しは親レイアウトが担う。 */
export default async function RaceBetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bets = await getBetsByRace(id);

  const totalAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const totalPayout = bets.reduce((sum, bet) => sum + (bet.payout ?? 0), 0);
  const hitCount = bets.filter((bet) => bet.status === 'HIT').length;

  return (
    <div className="space-y-6">
      <div className="rounded-control grid grid-cols-2 gap-4 bg-gray-50 p-4 text-center sm:grid-cols-4">
        <SummaryTile label="馬券数" value={`${bets.length}枚`} />
        <SummaryTile label="投票額" value={`${totalAmount.toLocaleString('ja-JP')}円`} />
        <SummaryTile label="払戻額" value={`${totalPayout.toLocaleString('ja-JP')}円`} />
        <SummaryTile label="的中" value={`${hitCount}枚`} />
      </div>

      <TableShell>
        <TableHead>
          <Th>ユーザー</Th>
          <Th>券種</Th>
          <Th>選択馬</Th>
          <Th>金額</Th>
          <Th>購入日時</Th>
          <Th>状態</Th>
        </TableHead>
        <TableBody>
          {bets.length === 0 && <TableEmptyRow colSpan={6}>このレースに購入された馬券はありません</TableEmptyRow>}
          {bets.map((bet) => (
            <TableRow key={bet.id}>
              <Td className="font-medium text-gray-900">{bet.user.name || 'Unknown'}</Td>
              <Td>
                <Badge variant="status" label={BET_TYPE_LABELS[bet.details.type]} />
              </Td>
              <Td className="font-semibold text-gray-900">{JSON.stringify(bet.details.selections)}</Td>
              <Td className="font-semibold text-gray-900">{bet.amount.toLocaleString('ja-JP')}円</Td>
              <Td className="text-gray-500">
                <FormattedDate date={bet.createdAt} />
              </Td>
              <Td>
                <Badge
                  variant="status"
                  label={lookup(BET_STATUS_LABELS, bet.status) ?? bet.status}
                  className={lookup(BET_STATUS_CLASSES, bet.status)}
                />
              </Td>
            </TableRow>
          ))}
        </TableBody>
      </TableShell>
    </div>
  );
}
