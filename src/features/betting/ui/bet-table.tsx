'use client';

import { BET_TYPES, getValidBetCombinations } from '@/entities/bet';
import { useRaceOdds as useRaceOddsData } from '@/features/betting';
import { placeBets } from '@/features/betting/actions';
import { useBetSelections } from '@/features/betting/hooks/use-bet-selections';
import { formatRemainingTime, useRaceTimer } from '@/features/betting/hooks/use-race-timer';
import type { getRaceOdds } from '@/features/betting/logic/odds';
import { getBetTypeColumnLabels } from '@/features/betting/model/bet-types';
import { BetSummaryFooter } from '@/features/betting/ui/bet-summary-footer';
import { BetTypeSelector } from '@/features/betting/ui/bet-type-selector';
import { GuaranteedOddsDialog } from '@/features/betting/ui/guaranteed-odds-dialog';
import { Badge, Button, Checkbox, LiveConnectionStatus } from '@/shared/ui';
import { BracketBadge } from '@/shared/ui/bracket-badge';
import { FormattedDate } from '@/shared/ui/formatted-date';
import { getGenderAge } from '@/shared/utils/gender';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertCircle, Clock, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

interface Entry {
  id: string;
  bracketNumber: number | null;
  horseNumber: number | null;
  horseName: string;
  horseGender: string;
  horseAge: number | null;
  status: string;
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
  walletId: string;
  balance: number;
  entries: Entry[];
  initialStatus: string;
  closingAt: string | null;
  initialOdds: Awaited<ReturnType<typeof getRaceOdds>>;
  fixedOddsMode?: boolean;
  guaranteedOdds?: Record<string, number> | null;
}

export function BetTable({
  raceId,
  walletId,
  balance,
  entries,
  initialStatus,
  closingAt,
  initialOdds,
  fixedOddsMode = false,
  guaranteedOdds,
}: BetTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showBetConfirm, setShowBetConfirm] = useState(false);

  const { isClosed, setIsClosed, remainingMs, setClosingAt } = useRaceTimer({
    initialStatus,
    closingAt,
  });

  const { odds, connectionStatus } = useRaceOddsData(raceId, initialOdds, fixedOddsMode, {
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
    handleBetTypeChange,
    handleCheckboxChange,
    resetSelections,
  } = useBetSelections({ entries });

  const columnLabels = getBetTypeColumnLabels(betType);

  const handleSubmitRequest = () => {
    const error = validateBetSubmission(betCount, amount, totalAmount, balance);
    if (error) {
      toast.error(error);
      return;
    }
    setShowBetConfirm(true);
  };

  const handleSubmit = () => {
    setShowBetConfirm(false);
    const validCombinations = getValidBetCombinations(selectionsArray, betType, bracketHorseCount);

    startTransition(async () => {
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
        router.refresh();
      } catch {
        toast.error('エラーが発生しました');
      }
    });
  };

  const isBracketType = betType === BET_TYPES.BRACKET_QUINELLA;

  const bracketGroups = isBracketType
    ? entries.reduce<Record<number, Entry[]>>((acc, entry) => {
        const bracket = entry.bracketNumber!;
        if (!acc[bracket]) {
          acc[bracket] = [];
        }
        acc[bracket].push(entry);
        return acc;
      }, {})
    : {};

  if (entries.length === 0) {
    return (
      <div className="space-y-6">
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 shadow-lg backdrop-blur-sm">
          <LiveConnectionStatus status={connectionStatus} showText={true} className="text-white" />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-gray-50 py-16 text-center">
          <div className="rounded-full bg-gray-100 p-3">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900">出走馬が登録されていません</h3>
            <p className="text-sm text-gray-500">
              このレースの出走馬データはまだ登録されていません。
              <br />
              データが登録されるまでお待ちください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 shadow-lg backdrop-blur-sm">
        <LiveConnectionStatus status={connectionStatus} showText={true} className="text-white" />
      </div>
      {isClosed && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-600 ring-1 ring-red-100">
          <AlertCircle className="h-4 w-4" />
          このレースは受付を終了しました。現在、馬券を購入することはできません。
        </div>
      )}
      {!isClosed && remainingMs !== null && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-700 ring-1 ring-amber-100">
          <Clock className="h-4 w-4" />
          締切まで残り {formatRemainingTime(remainingMs)}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <BetTypeSelector betType={betType} onBetTypeChange={handleBetTypeChange} />
        {fixedOddsMode ? (
          <span className="flex w-full items-center justify-end gap-1 text-sm font-semibold text-blue-600 sm:w-auto">
            <Lock className="h-3.5 w-3.5" />
            Netkeibaオッズ（固定）
          </span>
        ) : (
          <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
            {odds?.updatedAt && (
              <span className="text-right text-sm text-gray-500">
                オッズ最終更新:{' '}
                <FormattedDate
                  date={odds.updatedAt}
                  options={{ hour: '2-digit', minute: '2-digit', second: '2-digit' }}
                />
              </span>
            )}
            <GuaranteedOddsDialog guaranteedOdds={guaranteedOdds} />
          </div>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="px-2 py-2 text-sm font-semibold">枠番</th>
              <th className="px-2 py-2 text-sm font-semibold">馬番</th>
              <th className="px-2 py-2 text-sm font-semibold">馬名</th>
              <th className="px-2 py-2 text-sm font-semibold">性齢</th>
              <th className="px-2 py-2 text-center text-sm font-semibold">単勝オッズ</th>
              {columnLabels.map((label, i) => (
                <th key={i} className="px-2 py-2 text-center text-sm font-semibold">
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
                            ? 'border-b border-gray-300 bg-red-50/50 text-gray-400 line-through last:border-0'
                            : 'border-b border-gray-300 transition-colors last:border-0 hover:bg-gray-50'
                        }
                      >
                        {idx === 0 && (
                          <td className="px-2 align-middle" rowSpan={bracketEntries.length}>
                            <BracketBadge bracketNumber={Number(bracket)} />
                          </td>
                        )}
                        <td className="px-2 py-2 text-sm font-semibold">{entry.horseNumber}</td>
                        <td className="px-2 py-2 text-sm font-semibold">
                          {entry.horseName}
                          {isScratched && (
                            <span className="ml-1.5 inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-sm font-semibold text-red-600 no-underline">
                              取消
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <Badge variant="gender" label={getGenderAge(entry.horseGender, entry.horseAge)} />
                        </td>
                        <td className="px-2 py-2 text-center text-sm font-medium">
                          {isScratched ? '-' : (odds?.winOdds?.[entry.horseNumber!]?.toFixed(1) ?? '-.-')}
                        </td>

                        {idx === 0 &&
                          Array.from({ length: columnCount }).map((_, colIdx) => (
                            <td key={colIdx} className="px-2 text-center align-middle" rowSpan={bracketEntries.length}>
                              <Checkbox
                                checked={selections[colIdx].has(Number(bracket))}
                                onCheckedChange={() => handleCheckboxChange(colIdx, Number(bracket))}
                                disabled={isClosed || isPending}
                                aria-label={`${columnLabels[colIdx]} に枠${bracket}を選択`}
                                className="data-[state=checked]:border-primary data-[state=checked]:bg-primary h-5 w-5"
                              />
                            </td>
                          ))}
                      </tr>
                    );
                  })
                )
              : entries.map((entry) => {
                  const isScratched = entry.status === 'SCRATCHED' || entry.status === 'EXCLUDED';
                  return (
                    <tr
                      key={entry.id}
                      className={
                        isScratched
                          ? 'border-b border-gray-300 bg-red-50/50 text-gray-400 line-through last:border-0'
                          : 'border-b border-gray-300 transition-colors last:border-0 hover:bg-gray-50'
                      }
                    >
                      <td className="px-2 py-2">
                        <BracketBadge bracketNumber={entry.bracketNumber} />
                      </td>
                      <td className="px-2 py-2 text-sm font-semibold">{entry.horseNumber}</td>
                      <td className="px-2 py-2 text-sm font-semibold">
                        {entry.horseName}
                        {isScratched && (
                          <span className="ml-1.5 inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-sm font-semibold text-red-600 no-underline">
                            取消
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <Badge variant="gender" label={getGenderAge(entry.horseGender, entry.horseAge)} />
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-medium">
                        {isScratched ? '-' : (odds?.winOdds?.[entry.horseNumber!]?.toFixed(1) ?? '-.-')}
                      </td>

                      {Array.from({ length: columnCount }).map((_, colIdx) => (
                        <td key={colIdx} className="px-2 py-2 text-center">
                          <Checkbox
                            checked={!isScratched && selections[colIdx].has(entry.horseNumber!)}
                            onCheckedChange={() => handleCheckboxChange(colIdx, entry.horseNumber!)}
                            disabled={isClosed || isPending || isScratched}
                            aria-label={`${columnLabels[colIdx]} に${entry.horseName}(${entry.horseNumber}番)を選択`}
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

      <AlertDialog.Root open={showBetConfirm} onOpenChange={setShowBetConfirm}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="animate-in fade-in fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <AlertDialog.Content className="animate-in zoom-in-95 fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <AlertDialog.Title className="mb-1 text-xl font-semibold text-gray-900">
                馬券を購入しますか？
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-gray-500">
                {betCount}点・合計{' '}
                <span className="font-semibold text-gray-900">{totalAmount.toLocaleString('ja-JP')}円</span>{' '}
                を購入します。
              </AlertDialog.Description>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <AlertDialog.Action asChild>
                <Button onClick={handleSubmit} className="w-full font-semibold">
                  購入する
                </Button>
              </AlertDialog.Action>
              <AlertDialog.Cancel asChild>
                <Button variant="outline" className="w-full font-semibold">
                  キャンセル
                </Button>
              </AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
