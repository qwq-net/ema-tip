import { BET_TYPE_LABELS, BET_TYPE_ORDER, type BetType, isOrderSensitive } from '@/entities/bet';
import { BetTypeBadge } from '@/entities/bet/ui/bet-type-badge';
import { type BetGroupRow, getRaceBetGroupPage, getRaceBetOverview } from '@/features/admin/manage-bets/actions/read';
import {
  BET_GROUP_PAGE_SIZE,
  BET_GROUP_STATUSES,
  type BetGroupListParams,
  type BetGroupSortKey,
  type BetGroupStatus,
  buildBetGroupListQuery,
  parseBetGroupListParams,
} from '@/features/admin/manage-bets/lib/list-params';
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  TableBody,
  TableEmptyRow,
  TableHead,
  TableRow,
  TableShell,
  Td,
  Th,
} from '@/shared/ui';
import { FormattedDate } from '@/shared/ui/formatted-date';
import { cn } from '@/shared/utils/cn';
import { formatYen } from '@/shared/utils/format-yen';
import { lookup } from '@/shared/utils/lookup';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'レースの馬券',
};

const STATUS_LABELS = {
  PENDING: '未確定',
  HIT: '的中',
  LOST: '不的中',
  REFUNDED: '返還',
} satisfies Record<BetGroupStatus, string>;

// 的中だけを緑で強調し、他は Badge の既定色に任せる
const STATUS_CLASSES = {
  HIT: 'bg-green-100 text-green-800',
} satisfies Partial<Record<BetGroupStatus, string>>;

/** 組み合わせを「1→3→5」または「1-3」の形にする。着順が意味を持つ券種だけ矢印でつなぐ。 */
function formatSelections(type: BetType, selections: number[]): string {
  return selections.join(isOrderSensitive(type) ? '→' : '-');
}

/** 圧縮した買い目を桁ごとに「1,3,5 → 2 → 4」の形にする。1 桁の中は馬番を , で並べる。 */
function formatPositions(type: BetType, positions: number[][]): string {
  return positions.map((p) => p.join(',')).join(isOrderSensitive(type) ? ' → ' : ' - ');
}

/** 集計 1 項目。ラベルと値を縦に並べ、補足があれば値の下に添える。 */
function SummaryTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <div className="text-text-sub text-sm">{label}</div>
      <div className="text-text-main mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {note && <div className="text-text-sub mt-0.5 text-sm">{note}</div>}
    </div>
  );
}

/** 並び替え列の見出し。現在の並び順なら矢印を出し、クリックで昇降を反転する。 */
function SortHeader({
  label,
  sortKey,
  params,
  basePath,
  className,
}: {
  label: string;
  sortKey: BetGroupSortKey;
  params: BetGroupListParams;
  basePath: string;
  className?: string;
}) {
  const isCurrent = params.sort === sortKey;
  const nextDir = isCurrent && params.dir === 'desc' ? 'asc' : 'desc';
  const Arrow = params.dir === 'asc' ? ArrowUp : ArrowDown;
  let ariaSort: 'ascending' | 'descending' | undefined;
  if (isCurrent) ariaSort = params.dir === 'asc' ? 'ascending' : 'descending';
  return (
    <Th className={className} aria-sort={ariaSort}>
      <Link
        href={`${basePath}${buildBetGroupListQuery(params, { sort: sortKey, dir: nextDir })}`}
        className={cn('hover:text-text-main inline-flex items-center gap-1', isCurrent && 'text-text-main')}
      >
        {label}
        {isCurrent && <Arrow className="h-3.5 w-3.5" aria-hidden="true" />}
      </Link>
    </Th>
  );
}

/** 検索・絞り込みフォーム。GET で送るため URL がそのまま条件になり、共有や戻る操作が効く。 */
function FilterForm({ params, basePath }: { params: BetGroupListParams; basePath: string }) {
  const hasFilter = params.q !== undefined || params.type !== undefined || params.status !== undefined;
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="min-w-48">
        <Label htmlFor="bet-q">ユーザー名</Label>
        <Input id="bet-q" name="q" defaultValue={params.q ?? ''} placeholder="部分一致で検索" maxLength={50} />
      </div>
      <div className="min-w-36">
        <Label htmlFor="bet-type">券種</Label>
        <Select id="bet-type" name="type" defaultValue={params.type ?? ''}>
          <option value="">すべて</option>
          {BET_TYPE_ORDER.map((type) => (
            <option key={type} value={type}>
              {BET_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </div>
      <div className="min-w-36">
        <Label htmlFor="bet-status">状態</Label>
        <Select id="bet-status" name="status" defaultValue={params.status ?? ''}>
          <option value="">すべて</option>
          {BET_GROUP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </div>
      {params.sort !== 'createdAt' && <input type="hidden" name="sort" value={params.sort} />}
      {params.dir !== 'desc' && <input type="hidden" name="dir" value={params.dir} />}
      <Button type="submit" variant="outline">
        絞り込む
      </Button>
      {hasFilter && (
        <Link href={basePath} className="text-text-sub hover:text-text-main text-sm underline underline-offset-2">
          条件をクリア
        </Link>
      )}
    </form>
  );
}

/** ページ送り。件数の範囲と前後のリンクを出し、端では無効表示にする。 */
function Pagination({ params, total, basePath }: { params: BetGroupListParams; total: number; basePath: string }) {
  const start = total === 0 ? 0 : (params.page - 1) * BET_GROUP_PAGE_SIZE + 1;
  const end = Math.min(params.page * BET_GROUP_PAGE_SIZE, total);
  const hasPrev = params.page > 1;
  const hasNext = end < total;
  const linkClass = 'rounded-control px-3 py-1.5 text-sm font-semibold ring-1 ring-gray-200 hover:bg-gray-50';
  const disabledClass = 'rounded-control px-3 py-1.5 text-sm font-semibold text-gray-300 ring-1 ring-gray-100';
  return (
    <nav aria-label="ページ送り" className="text-text-sub flex items-center justify-between text-sm">
      <span className="tabular-nums">
        {start}〜{end} / {total} 件
      </span>
      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Link href={`${basePath}${buildBetGroupListQuery(params, { page: params.page - 1 })}`} className={linkClass}>
            前へ
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>
            前へ
          </span>
        )}
        {hasNext ? (
          <Link href={`${basePath}${buildBetGroupListQuery(params, { page: params.page + 1 })}`} className={linkClass}>
            次へ
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>
            次へ
          </span>
        )}
      </div>
    </nav>
  );
}

/** 購入 1 回分の行。買い目の下に的中した組み合わせを並べる。 */
function BetGroupTableRow({ row }: { row: BetGroupRow }) {
  return (
    <TableRow>
      <Td className="text-text-sub">
        <FormattedDate
          date={row.createdAt}
          options={{ month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }}
        />
      </Td>
      <Td className="text-text-main font-semibold">{row.userName || 'Unknown'}</Td>
      <Td>
        <BetTypeBadge type={row.type} />
      </Td>
      <Td className="whitespace-normal">
        <div className="text-text-main font-semibold tabular-nums">{formatPositions(row.type, row.positions)}</div>
        {row.hits.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-sm text-green-800 tabular-nums">
            {row.hits.map((hit) => (
              <li key={hit.selections.join('-')}>
                的中 {formatSelections(row.type, hit.selections)} {formatYen(hit.payout)}
              </li>
            ))}
          </ul>
        )}
      </Td>
      <Td className="text-right text-gray-600 tabular-nums">{row.betCount}点</Td>
      <Td className="text-text-main text-right font-semibold tabular-nums">{formatYen(row.totalAmount)}</Td>
      <Td className={cn('text-right tabular-nums', row.payout > 0 ? 'text-text-main font-semibold' : 'text-text-sub')}>
        {formatYen(row.payout)}
      </Td>
      <Td>
        <Badge variant="status" label={STATUS_LABELS[row.status]} className={lookup(STATUS_CLASSES, row.status)} />
      </Td>
    </TableRow>
  );
}

/**
 * レースに購入された馬券の一覧。購入 1 回を 1 行にし、検索・絞り込み・並び替え・ページ送りを URL クエリで持つ。
 * レース自体の存在確認と見出しは親レイアウトが担う。
 */
export default async function RaceBetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, rawSearch] = await Promise.all([params, searchParams]);
  const listParams = parseBetGroupListParams(rawSearch);
  const basePath = `/admin/races/${id}/bets`;

  const [overview, page] = await Promise.all([getRaceBetOverview(id), getRaceBetGroupPage(id, listParams)]);
  const hasFilter = listParams.q !== undefined || listParams.type !== undefined || listParams.status !== undefined;
  // URL の page が末尾ページを超えていたら末尾ページへ送り直す。表示だけ丸めると表が空のまま件数範囲が末尾の値になる
  const lastPage = Math.max(1, Math.ceil(page.total / BET_GROUP_PAGE_SIZE));
  if (listParams.page > lastPage) {
    redirect(`${basePath}${buildBetGroupListQuery(listParams, { page: lastPage })}`);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-control grid grid-cols-2 gap-4 bg-gray-50 p-4 text-center sm:grid-cols-4">
        <SummaryTile label="購入者" value={`${overview.buyerCount}人`} />
        <SummaryTile label="購入" value={`${overview.purchaseCount}回`} note={`${overview.betCount}点`} />
        <SummaryTile label="投票額" value={formatYen(overview.totalAmount)} />
        <SummaryTile label="払戻額" value={formatYen(overview.totalPayout)} note={`的中 ${overview.hitCount}点`} />
      </div>

      <FilterForm params={listParams} basePath={basePath} />

      <TableShell>
        <TableHead>
          <SortHeader label="購入日時" sortKey="createdAt" params={listParams} basePath={basePath} />
          <Th>ユーザー</Th>
          <Th>券種</Th>
          <Th>買い目</Th>
          <Th className="text-right">点数</Th>
          <SortHeader label="投票額" sortKey="amount" params={listParams} basePath={basePath} className="text-right" />
          <SortHeader label="払戻" sortKey="payout" params={listParams} basePath={basePath} className="text-right" />
          <Th>状態</Th>
        </TableHead>
        <TableBody>
          {page.rows.length === 0 && (
            <TableEmptyRow colSpan={8}>
              {hasFilter ? '条件に一致する購入はありません' : 'このレースに購入された馬券はありません'}
            </TableEmptyRow>
          )}
          {page.rows.map((row) => (
            <BetGroupTableRow key={row.id} row={row} />
          ))}
        </TableBody>
      </TableShell>

      <Pagination params={listParams} total={page.total} basePath={basePath} />
    </div>
  );
}
