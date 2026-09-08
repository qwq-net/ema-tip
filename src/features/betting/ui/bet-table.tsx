'use client';

import type { BetType } from '@/entities/bet';
import { BET_TYPE_DESCRIPTIONS, BET_TYPE_LABELS, BET_TYPES, getValidBetCombinations } from '@/entities/bet';
import { useRaceOdds as useRaceOddsData } from '@/features/betting';
import { placeBets } from '@/features/betting/actions';
import { useBetSelections } from '@/features/betting/hooks/use-bet-selections';
import { formatRemainingTime, useRaceTimer } from '@/features/betting/hooks/use-race-timer';
import type { getRaceOdds } from '@/features/betting/logic/odds';
import { getBetTypeColumnLabels } from '@/features/betting/model/bet-types';
import { BetSummaryFooter } from '@/features/betting/ui/bet-summary-footer';
import { BetTypeSelector } from '@/features/betting/ui/bet-type-selector';
import { GuaranteedOddsDialog } from '@/features/betting/ui/guaranteed-odds-dialog';
import { medalRankClass } from '@/shared/constants/rank-medal';
import { toast } from '@/shared/lib/toast';
import { Alert, Badge, Checkbox, ConfirmDialog, EmptyState, LiveStatusPill } from '@/shared/ui';
import { BracketBadge } from '@/shared/ui/bracket-badge';
import { FormattedDate } from '@/shared/ui/formatted-date';
import { cn } from '@/shared/utils/cn';
import { getGenderAge } from '@/shared/utils/gender';
import { AlertCircle, CircleHelp, Clock, Info, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

interface Entry {
  id: string;
  bracketNumber: number | null;
  horseNumber: number | null;
  horseName: string;
  horseGender: string;
  horseAge: number | null;
  status: string;
}

// 出馬表の行。馬番が確定していない出走馬は行にしないため horseNumber が必ず入る
type NumberedEntry = Entry & { horseNumber: number };

// 単勝オッズの1セル。文字色は通常のまま、SSE 更新で値が変化したときだけ
// 上昇は緑、下降は赤から本来の文字色へ減衰点灯する。
// version を key にして更新イベントごとにアニメーションを最初から再生する
function OddsValue({ value, delta, version }: { value: string; delta?: 'up' | 'down' | undefined; version: number }) {
  return (
    <span key={version} className={cn(delta === 'up' && 'animate-odds-up', delta === 'down' && 'animate-odds-down')}>
      {value}
    </span>
  );
}

// 人気順の1セル。賭け金額由来の順位で、未購入の馬と取消馬は「-」を表示する。
// 1〜3人気はランキングと共通の金銀銅チップで強調し、4人気以下は素のテキストで出す。
// オッズ列と人気列の両ブランチで同一実装を共有し、渡し漏れの分岐差を作らない
function PopularityCell({ rank, isScratched }: { rank?: number | undefined; isScratched: boolean }) {
  return (
    <td className="px-2 py-2 text-center text-sm font-semibold whitespace-nowrap tabular-nums">
      {(isScratched || rank === undefined) && '-'}
      {!isScratched &&
        rank !== undefined &&
        (medalRankClass(rank) ? (
          <span className={cn('rounded-chip px-1.5 py-0.5 text-xs font-semibold', medalRankClass(rank))}>
            {rank}人気
          </span>
        ) : (
          `${rank}人気`
        ))}
    </td>
  );
}

// 複勝オッズの1セル。値は「最小-最大」の幅表示で、幅がなければ単一値を出す。
// 未購入の馬と取消馬は単勝オッズ列と同じ「-.-」「-」の表記に合わせる
function PlaceOddsCell({
  range,
  isScratched,
}: {
  range?: { min: number; max: number } | undefined;
  isScratched: boolean;
}) {
  const format = () => {
    if (!range) return '-.-';
    return range.min === range.max ? range.min.toFixed(1) : `${range.min.toFixed(1)}-${range.max.toFixed(1)}`;
  };
  return (
    <td className="px-2 py-2 text-center text-sm font-semibold whitespace-nowrap tabular-nums">
      {isScratched ? '-' : format()}
    </td>
  );
}

/**
 * 枠連系の出馬表で、選択列のチェックボックスを列数ぶん並べる。
 * 枠のセルは同じ枠の行をまとめた 1 セルなので rowSpan を受け取る。
 * チェックの状態は列ごとの選択集合が持ち、切り替えは onToggle へ委ねる。
 */
function BracketSelectionCells({
  bracketNumber,
  rowSpan,
  columnCount,
  columnLabels,
  selections,
  disabled,
  onToggle,
}: {
  bracketNumber: number;
  rowSpan: number;
  columnCount: number;
  columnLabels: string[];
  selections: Set<number>[];
  disabled: boolean;
  onToggle: (columnIndex: number, bracketNumber: number) => void;
}) {
  return (
    <>
      {selections.slice(0, columnCount).map((selection, colIdx) => (
        <td key={colIdx} className="px-2 text-center align-middle" rowSpan={rowSpan}>
          <Checkbox
            checked={selection.has(bracketNumber)}
            onCheckedChange={() => onToggle(colIdx, bracketNumber)}
            disabled={disabled}
            aria-label={`${columnLabels[colIdx] ?? ''} に枠${bracketNumber}を選択`}
            className="data-[state=checked]:border-primary data-[state=checked]:bg-primary h-5 w-5"
          />
        </td>
      ))}
    </>
  );
}

// 人気列ヘッダの説明ツールチップ。ホバーとフォーカスで開き、離れるか Escape で閉じる。
// タッチ端末はホバーもフォーカス外れも起きないため、タップだけは開閉の切り替えにする。
// ヘッダは横スクロールコンテナの最上段にあり、絶対配置で上へ出すと上端で切れるため、
// 開いた時点のボタン位置を基準に fixed でアイコンの上へ表示する
function PopularityHelp() {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const open = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPosition({ top: rect.top - 6, left: rect.left + rect.width / 2 });
  };
  const close = () => setPosition(null);

  return (
    <span className="inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label="人気の説明"
        aria-expanded={position !== null}
        onPointerDown={(e) => {
          if (e.pointerType === 'touch' && position) close();
        }}
        onClick={open}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        className="text-text-sub hover:text-text-main -my-1 inline-flex items-center justify-center p-1"
      >
        <CircleHelp className="h-5 w-5" />
      </button>
      {position && (
        <span
          role="tooltip"
          style={{ top: position.top, left: position.left }}
          className="rounded-control fixed z-50 w-56 -translate-x-1/2 -translate-y-full bg-gray-900 px-3 py-2 text-left text-sm font-normal whitespace-normal text-white shadow-lg"
        >
          人気は単勝の賭け金額が多い順です。同額のときは購入件数が多い馬が上位になります。それも同じなら馬番が小さい馬が上位です。
        </span>
      )}
    </span>
  );
}

interface OddsHeaderInfoProps {
  fixedOddsMode: boolean;
  updatedAt: Date | string | null | undefined;
  oddsVersion: number;
  guaranteedOdds?: Record<string, number> | null | undefined;
}

/**
 * 出馬表の上に置くオッズの状態表示。固定オッズのレースでは Netkeiba 由来である旨だけを出す。
 * 変動オッズでは最終更新時刻と、保証オッズの内訳を開くボタンを並べる。
 */
function OddsHeaderInfo({ fixedOddsMode, updatedAt, oddsVersion, guaranteedOdds }: OddsHeaderInfoProps) {
  if (fixedOddsMode) {
    return (
      <span className="text-primary flex w-full items-center justify-end gap-1 text-sm font-semibold sm:w-auto">
        <Lock className="h-3.5 w-3.5" />
        Netkeibaオッズ（固定）
      </span>
    );
  }

  return (
    <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
      {updatedAt && (
        // key と点灯クラスで SSE 更新のたびにブランド緑からグレーへ減衰再生する。初期表示では点灯しない
        <span
          key={oddsVersion}
          className={cn('text-text-sub text-right text-sm', oddsVersion > 0 && 'animate-stamp-flash')}
        >
          オッズ最終更新:{' '}
          <FormattedDate date={updatedAt} options={{ hour: '2-digit', minute: '2-digit', second: '2-digit' }} />
        </span>
      )}
      <GuaranteedOddsDialog guaranteedOdds={guaranteedOdds} />
    </div>
  );
}

/**
 * まだ 1 件も購入がなく、変動オッズが立っていないことの案内。
 * 固定オッズのレースでは Netkeiba の値が最初から入るため何も出さない。
 */
function OddsPendingAlert({
  fixedOddsMode,
  odds,
}: {
  fixedOddsMode: boolean;
  odds: { updatedAt?: Date | string | null } | null | undefined;
}) {
  if (fixedOddsMode || odds?.updatedAt) return null;
  return (
    <Alert variant="info" icon={Info}>
      まだ購入がないため、オッズは確定していません。的中したときの倍率は保証オッズが下限になります。
    </Alert>
  );
}

// 購入確定前のバリデーション。エラーメッセージを返し、問題なければ null を返す。
function validateBetSubmission(betCount: number, amount: number, totalAmount: number, balance: number): string | null {
  if (betCount === 0) {
    return '馬を選択してください';
  }

  if (amount < 100) {
    return '100円以上で入力してください';
  }

  if (totalAmount > balance) {
    return '残高が不足しています';
  }

  return null;
}

interface BetTableProps {
  raceId: string;
  eventId: string;
  walletId: string;
  balance: number;
  entries: Entry[];
  initialStatus: string;
  closingAt: string | null;
  initialOdds: Awaited<ReturnType<typeof getRaceOdds>>;
  fixedOddsMode?: boolean;
  guaranteedOdds?: Record<string, number> | null;
  // null は全種別購入可
  allowedBetTypes: BetType[] | null;
}

export function BetTable({
  raceId,
  eventId,
  walletId,
  balance,
  entries,
  initialStatus,
  closingAt,
  initialOdds,
  fixedOddsMode = false,
  guaranteedOdds,
  allowedBetTypes,
}: BetTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showBetConfirm, setShowBetConfirm] = useState(false);

  const { isClosed, setIsClosed, remainingMs, setClosingAt } = useRaceTimer({
    initialStatus,
    closingAt,
  });

  const { odds, oddsDeltas, oddsVersion, connectionStatus } = useRaceOddsData(raceId, initialOdds, fixedOddsMode, {
    eventId,
    onRaceBroadcast: () => router.push(`/races/${raceId}/standby`),
    onRaceClosed: () => setIsClosed(true),
    onRaceReopened: (newClosingAt) => {
      setIsClosed(false);
      setClosingAt(newClosingAt);
    },
    onRaceTimerSet: (newClosingAt) => setClosingAt(newClosingAt),
  });

  const {
    betType,
    selections,
    amount,
    setAmount,
    betCount,
    totalAmount,
    columnCount,
    bracketHorseCount,
    selectionsArray,
    boxMode,
    handleBoxModeChange,
    handleBetTypeChange,
    handleCheckboxChange,
    resetSelections,
  } = useBetSelections({ entries, allowedBetTypes });

  const columnLabels = getBetTypeColumnLabels(betType);

  // ボックス中は選択列を1本へ畳む。全列が同期するため複数列を見せる意味がなく、
  // 「着順候補の列に同じチェック」という順不同のボックスとズレた見た目も避ける
  const isBoxView = boxMode && columnCount > 1;
  const displayColumnCount = isBoxView ? 1 : columnCount;
  const displayColumnLabels = isBoxView ? ['ボックス'] : columnLabels;

  // 締切後と送信中は選択列を触れなくする
  const isSelectionLocked = isClosed || isPending;

  const handleSubmitRequest = () => {
    const error = validateBetSubmission(betCount, amount, totalAmount, balance);
    if (error) {
      toast.error(error);
      return;
    }
    setShowBetConfirm(true);
  };

  const handleSubmit = async () => {
    const validCombinations = getValidBetCombinations(selectionsArray, betType, bracketHorseCount);

    try {
      const result = await placeBets({
        raceId,
        walletId,
        betType,
        combinations: validCombinations,
        amountPerBet: amount,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${totalAmount.toLocaleString('ja-JP')}円分の馬券を購入しました`);
      resetSelections();
      // 画面反映が終わるまで isPending でフォームを無効化したいので、refresh のみ transition に載せる
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error('エラーが発生しました');
    }
  };

  const isBracketType = betType === BET_TYPES.BRACKET_QUINELLA;

  // 馬番の無い出走馬は選択も購入もできないため行にしない。
  // 枠連は枠番で選ぶので、useBetSelections 側の選択候補の条件とは一致しない
  const rows = entries.filter((entry): entry is NumberedEntry => entry.horseNumber !== null);

  const bracketGroups = isBracketType
    ? rows.reduce<Record<number, NumberedEntry[]>>((acc, entry) => {
        const bracket = entry.bracketNumber;
        // 枠番未設定の馬は枠連の対象外
        if (bracket === null) {
          return acc;
        }
        const group = (acc[bracket] ??= []);
        group.push(entry);
        return acc;
      }, {})
    : {};

  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        <LiveStatusPill status={connectionStatus} fixed />
        <EmptyState
          icon={AlertCircle}
          title="出走馬が登録されていません"
          description="出走馬のデータが登録されるまでお待ちください。"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LiveStatusPill status={connectionStatus} fixed />
      {isClosed && (
        <Alert variant="error" icon={AlertCircle}>
          このレースは受付を終了しました。現在、馬券を購入することはできません。
        </Alert>
      )}
      {!isClosed && remainingMs !== null && (
        <Alert variant="warning" icon={Clock} role="timer" className="tabular-nums">
          締切まで残り {formatRemainingTime(remainingMs)}
        </Alert>
      )}
      <OddsPendingAlert fixedOddsMode={fixedOddsMode} odds={odds} />
      {allowedBetTypes && (
        <div className="rounded-control bg-primary/5 text-primary ring-primary/10 flex items-center gap-2 p-3 text-sm font-semibold ring-1">
          <Info className="h-4 w-4 shrink-0" />
          このレースで購入できるのは {allowedBetTypes.map((t) => BET_TYPE_LABELS[t]).join('・')} です
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <BetTypeSelector betType={betType} onBetTypeChange={handleBetTypeChange} allowedBetTypes={allowedBetTypes} />
        <OddsHeaderInfo
          fixedOddsMode={fixedOddsMode}
          updatedAt={odds?.updatedAt}
          oddsVersion={oddsVersion}
          guaranteedOdds={guaranteedOdds}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-text-sub text-sm">{BET_TYPE_DESCRIPTIONS[betType]}</p>
        {/* 単勝・複勝では無効化して見せたままにする。券種切替のたびに消すと行の高さが変わり
            レイアウトシフトが起きるため、券種セレクタの許可外表示と同じく非表示にはしない */}
        <div role="group" aria-label="買い方" className="flex gap-0.5 rounded-full bg-gray-100 p-1">
          {(
            [
              { label: '通常', value: false },
              { label: 'ボックス', value: true },
            ] as const
          ).map(({ label, value }) => (
            <button
              key={label}
              type="button"
              aria-pressed={isBoxView === value}
              disabled={isClosed || isPending || columnCount < 2}
              onClick={() => handleBoxModeChange(value)}
              className={cn(
                'rounded-full px-3 py-1 text-sm font-semibold transition-colors disabled:opacity-50',
                isBoxView === value ? 'bg-primary text-white' : 'text-text-sub enabled:hover:text-text-main'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-surface overflow-x-auto border border-gray-200 bg-white">
        {/* 騎手は意図的に表示しない。ゲーム内の予想への影響が薄く、レース登録の運用負担を増やさないため */}
        <table className="w-full min-w-max text-left text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="px-2 py-2 text-center text-sm font-semibold whitespace-nowrap">枠番</th>
              <th className="px-2 py-2 text-center text-sm font-semibold whitespace-nowrap">馬番</th>
              <th className="px-2 py-2 text-sm font-semibold whitespace-nowrap">馬名</th>
              <th className="px-2 py-2 text-center text-sm font-semibold whitespace-nowrap">性齢</th>
              <th className="px-2 py-2 text-center text-sm font-semibold whitespace-nowrap">単勝オッズ</th>
              <th className="px-2 py-2 text-center text-sm font-semibold whitespace-nowrap">複勝オッズ</th>
              <th className="px-2 py-2 text-center text-sm font-semibold whitespace-nowrap">
                <span className="inline-flex items-center gap-0.5">
                  人気
                  <PopularityHelp />
                </span>
              </th>
              {displayColumnLabels.map((label, i) => (
                <th key={i} className="px-2 py-2 text-center text-sm font-semibold whitespace-nowrap">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isBracketType
              ? Object.entries(bracketGroups).map(([bracket, bracketEntries]) =>
                  bracketEntries.map((entry, idx) => {
                    const isScratched = entry.status === 'SCRATCHED' || entry.status === 'EXCLUDED';
                    return (
                      <tr
                        key={entry.id}
                        className={
                          isScratched
                            ? 'text-text-sub border-b border-gray-300 bg-red-50/50 line-through last:border-0'
                            : 'border-b border-gray-300 transition-colors last:border-0 hover:bg-gray-50'
                        }
                      >
                        {idx === 0 && (
                          <td className="px-2 text-center align-middle" rowSpan={bracketEntries.length}>
                            <BracketBadge bracketNumber={Number(bracket)} />
                          </td>
                        )}
                        <td className="px-2 py-2 text-center text-sm font-semibold">{entry.horseNumber}</td>
                        <td className="px-2 py-2 text-sm font-semibold">
                          {entry.horseName}
                          {isScratched && (
                            <span className="rounded-chip ml-1.5 inline-flex items-center bg-red-100 px-1.5 py-0.5 text-sm font-semibold text-red-600 no-underline">
                              取消
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Badge variant="gender" label={getGenderAge(entry.horseGender, entry.horseAge)} />
                        </td>
                        <td className="px-2 py-2 text-center text-sm font-semibold tabular-nums">
                          {isScratched ? (
                            '-'
                          ) : (
                            <OddsValue
                              value={odds?.winOdds?.[entry.horseNumber]?.toFixed(1) ?? '-.-'}
                              delta={oddsDeltas[String(entry.horseNumber)]}
                              version={oddsVersion}
                            />
                          )}
                        </td>
                        <PlaceOddsCell range={odds?.placeOdds?.[String(entry.horseNumber)]} isScratched={isScratched} />
                        <PopularityCell
                          rank={odds?.winPopularity?.[String(entry.horseNumber)]}
                          isScratched={isScratched}
                        />

                        {idx === 0 && (
                          <BracketSelectionCells
                            bracketNumber={Number(bracket)}
                            rowSpan={bracketEntries.length}
                            columnCount={displayColumnCount}
                            columnLabels={displayColumnLabels}
                            selections={selections}
                            disabled={isSelectionLocked}
                            onToggle={handleCheckboxChange}
                          />
                        )}
                      </tr>
                    );
                  })
                )
              : rows.map((entry) => {
                  const isScratched = entry.status === 'SCRATCHED' || entry.status === 'EXCLUDED';
                  return (
                    <tr
                      key={entry.id}
                      className={
                        isScratched
                          ? 'text-text-sub border-b border-gray-300 bg-red-50/50 line-through last:border-0'
                          : 'border-b border-gray-300 transition-colors last:border-0 hover:bg-gray-50'
                      }
                    >
                      <td className="px-2 py-2 text-center">
                        <BracketBadge bracketNumber={entry.bracketNumber} />
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold">{entry.horseNumber}</td>
                      <td className="px-2 py-2 text-sm font-semibold">
                        {entry.horseName}
                        {isScratched && (
                          <span className="rounded-chip ml-1.5 inline-flex items-center bg-red-100 px-1.5 py-0.5 text-sm font-semibold text-red-600 no-underline">
                            取消
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Badge variant="gender" label={getGenderAge(entry.horseGender, entry.horseAge)} />
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold tabular-nums">
                        {isScratched ? (
                          '-'
                        ) : (
                          <OddsValue
                            value={odds?.winOdds?.[entry.horseNumber]?.toFixed(1) ?? '-.-'}
                            delta={oddsDeltas[String(entry.horseNumber)]}
                            version={oddsVersion}
                          />
                        )}
                      </td>
                      <PlaceOddsCell range={odds?.placeOdds?.[String(entry.horseNumber)]} isScratched={isScratched} />
                      <PopularityCell
                        rank={odds?.winPopularity?.[String(entry.horseNumber)]}
                        isScratched={isScratched}
                      />

                      {selections.slice(0, displayColumnCount).map((selection, colIdx) => (
                        <td key={colIdx} className="px-2 py-2 text-center">
                          <Checkbox
                            checked={!isScratched && selection.has(entry.horseNumber)}
                            onCheckedChange={() => handleCheckboxChange(colIdx, entry.horseNumber)}
                            disabled={isSelectionLocked || isScratched}
                            aria-label={`${displayColumnLabels[colIdx] ?? ''} に${entry.horseName}(${entry.horseNumber}番)を選択`}
                            className="data-[state=checked]:border-primary data-[state=checked]:bg-primary h-5 w-5"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
      <BetSummaryFooter
        betCount={betCount}
        totalAmount={totalAmount}
        amount={amount}
        balance={balance}
        isClosed={isClosed}
        isPending={isPending}
        onAmountChange={setAmount}
        onSubmit={handleSubmitRequest}
      />

      <ConfirmDialog
        open={showBetConfirm}
        onOpenChange={setShowBetConfirm}
        title="馬券を購入しますか？"
        description={
          <>
            {betCount}点・合計{' '}
            <span className="text-text-main font-semibold">{totalAmount.toLocaleString('ja-JP')}円</span> を購入します。
          </>
        }
        confirmLabel="購入する"
        confirmVariant="primary"
        onConfirm={handleSubmit}
      />
    </div>
  );
}
