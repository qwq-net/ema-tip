import { BET_TYPE_LABELS } from '@/entities/bet';
import { getBetsByRace, getRaceWithBets } from '@/features/admin/manage-bets/actions/read';
import { AdminBackLink, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import { Badge, TableBody, TableEmptyRow, TableHead, TableRow, TableShell, Td, Th } from '@/shared/ui';
import { FormattedDate } from '@/shared/ui/formatted-date';
import { lookup } from '@/shared/utils/lookup';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: '馬券詳細',
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

interface BetDetailPageProps {
  params: Promise<{ raceId: string }>;
}

export default async function BetDetailPage({ params }: BetDetailPageProps) {
  const { raceId } = await params;
  const race = await getRaceWithBets(raceId);

  if (!race) {
    notFound();
  }

  const bets = await getBetsByRace(raceId);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-4">
          <AdminBackLink href="/admin/bets">馬券管理に戻る</AdminBackLink>
        </div>
        <AdminPageHeader
          title={race.name}
          description={
            <div className="flex items-center gap-4">
              <span>{race.event.name}</span>
              <span>•</span>
              <span>{race.venue.shortName}</span>
              <span>•</span>
              <span>
                {race.surface} {race.distance}m
              </span>
            </div>
          }
        />
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

      <div className="rounded-control bg-gray-50 p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-500">総馬券数</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{bets.length}枚</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">総投票額</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {bets.reduce((sum, bet) => sum + bet.amount, 0).toLocaleString('ja-JP')}円
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">的中馬券数</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {bets.filter((bet) => bet.status === 'HIT').length}枚
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
