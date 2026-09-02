'use client';

import { BetSummaryFooter, placeBet5BetAction } from '@/features/betting';
import { toast } from '@/shared/lib/toast';
import { Checkbox, ConfirmDialog } from '@/shared/ui';
import { getBracketColor } from '@/shared/utils/bracket';
import { cn } from '@/shared/utils/cn';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface RaceWithEntries {
  id: string;
  raceNumber: number | null;
  name: string;
  surface: string;
  distance: number;
  entries: {
    id: string;
    horseNumber: number | null;
    bracketNumber: number | null;
    status: string;
    horse: {
      id: string;
      name: string;
    };
  }[];
}

interface Bet5VotingFormProps {
  eventId: string;
  bet5EventId: string;
  races: RaceWithEntries[];
  balance: number;
}

export function Bet5VotingForm({ eventId, bet5EventId, races, balance }: Bet5VotingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [amount, setAmount] = useState(100);
  const [activeTab, setActiveTab] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  // 選択後に取消となった馬を選択状態から取り除く。残すと点数に数えられ、外れ確定の買い目に課金される
  let selectionsChanged = false;
  const prunedSelections: Record<string, string[]> = {};
  for (const race of races) {
    const entrants = new Set(race.entries.filter((entry) => entry.status === 'ENTRANT').map((entry) => entry.horse.id));
    const current = selections[race.id] || [];
    const filtered = current.filter((horseId) => entrants.has(horseId));
    if (filtered.length !== current.length) selectionsChanged = true;
    prunedSelections[race.id] = filtered;
  }
  if (selectionsChanged) {
    setSelections(prunedSelections);
  }

  const toggleSelection = (raceId: string, horseId: string) => {
    setSelections((prev) => {
      const current = prev[raceId] || [];
      if (current.includes(horseId)) {
        return { ...prev, [raceId]: current.filter((id) => id !== horseId) };
      } else {
        return { ...prev, [raceId]: [...current, horseId] };
      }
    });
  };

  let points = 1;
  const isEveryRaceSelected = races.every((race) => (selections[race.id]?.length || 0) > 0);

  if (isEveryRaceSelected) {
    for (const race of races) {
      points *= selections[race.id]?.length || 0;
    }
  } else {
    points = 0;
  }

  const totalCost = points * amount;

  const handleCheck = () => {
    if (!isEveryRaceSelected) {
      toast.error('全てのレースで少なくとも1頭選択してください');
      return;
    }

    if (points === 0) {
      toast.error('選択が無効です');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      const raceIds = races.map((r) => r.id);

      const result = await placeBet5BetAction({
        bet5EventId,
        eventId,
        unitAmount: amount,
        selections: {
          race1: selections[raceIds[0]] || [],
          race2: selections[raceIds[1]] || [],
          race3: selections[raceIds[2]] || [],
          race4: selections[raceIds[3]] || [],
          race5: selections[raceIds[4]] || [],
        },
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('投票を受け付けました！');
      // 遷移が完了するまで isPending でフッターを無効化したいので、push のみ transition に載せる
      startTransition(() => {
        router.push('/mypage/sokubet');
      });
    } catch (error) {
      toast.error('投票に失敗しました');
      console.error(error);
    }
  };

  const activeRace = races[activeTab];
  const activeRaceSelections = selections[activeRace.id] || [];

  return (
    <>
      <div className="space-y-6 pb-32">
        <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {races.map((race, index) => {
            const selectionCount = selections[race.id]?.length || 0;
            return (
              <button
                key={race.id}
                type="button"
                onClick={() => setActiveTab(index)}
                aria-current={index === activeTab || undefined}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50',
                  index === activeTab && 'bg-indigo-50/50'
                )}
              >
                <span className="text-text-sub shrink-0 text-sm font-semibold">第{index + 1}戦</span>
                <span className="shrink-0 font-semibold text-gray-700">{race.raceNumber}R</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-gray-900">{race.name}</span>
                  <span className="text-text-sub block text-sm">
                    {race.surface}
                    {race.distance}m・{race.entries.length}頭
                  </span>
                </span>
                <span
                  className={cn(
                    'ml-auto shrink-0 text-sm font-semibold',
                    selectionCount > 0 ? 'text-indigo-600' : 'text-text-sub'
                  )}
                >
                  {selectionCount > 0 ? `${selectionCount}頭選択` : '未選択'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex overflow-x-auto border-b border-gray-200">
          {races.map((race, index) => {
            const isSelected = index === activeTab;
            const selectionCount = selections[race.id]?.length || 0;
            return (
              <button
                key={race.id}
                type="button"
                onClick={() => setActiveTab(index)}
                aria-current={isSelected || undefined}
                className={cn(
                  'relative flex min-w-[80px] flex-1 flex-col items-center justify-center gap-1 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50',
                  isSelected ? 'border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500'
                )}
              >
                <span className={cn('text-sm whitespace-nowrap', isSelected && 'font-semibold text-indigo-700')}>
                  {race.raceNumber}R
                </span>
                {selectionCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-100 px-1.5 text-sm font-semibold text-indigo-700">
                    {selectionCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-semibold text-gray-800">
              {activeRace.raceNumber}R {activeRace.name}
            </h2>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50">
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2 text-center font-semibold text-gray-500">枠</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-500">番</th>
                  <th className="px-4 py-2 font-semibold text-gray-500">馬名</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-500">選択</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeRace.entries.map((entry) => {
                  const isScratched = entry.status === 'SCRATCHED' || entry.status === 'EXCLUDED';
                  const isSelected = !isScratched && activeRaceSelections.includes(entry.horse.id);
                  return (
                    <tr
                      key={entry.id}
                      className={
                        isScratched
                          ? 'text-text-sub bg-red-50/50 line-through'
                          : `cursor-pointer transition-colors hover:bg-gray-50 ${isSelected ? 'bg-indigo-50/50 hover:bg-indigo-50' : ''}`
                      }
                      onClick={() => !isScratched && toggleSelection(activeRace.id, entry.horse.id)}
                    >
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded text-sm font-semibold shadow-sm ${getBracketColor(entry.bracketNumber || 0)}`}
                        >
                          {entry.bracketNumber || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-medium">{entry.horseNumber || '-'}</td>
                      <td className="px-4 py-3 font-medium">
                        {entry.horse.name}
                        {isScratched && (
                          <span className="ml-1.5 inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-sm font-semibold text-red-600 no-underline">
                            取消
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(activeRace.id, entry.horse.id)}
                            disabled={isScratched}
                            aria-label={`${entry.horseNumber ?? '-'}番 ${entry.horse.name}を選択`}
                            className="h-5 w-5 border-gray-300 data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 z-50 w-full border-t border-gray-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg md:relative md:border-none md:bg-transparent md:p-0 md:pb-0 md:shadow-none">
          <div className="container mx-auto max-w-4xl space-y-2 md:px-0">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <span className="font-semibold text-gray-600">{activeRace.raceNumber}R 選択馬:</span>
              {activeRaceSelections.length > 0 ? (
                <span className="font-semibold text-indigo-600">
                  {activeRace.entries
                    .filter((e) => activeRaceSelections.includes(e.horse.id))
                    .map((e) => e.horseNumber)
                    .sort((a, b) => (a || 0) - (b || 0))
                    .join(', ')}
                  番
                </span>
              ) : (
                <span className="text-text-sub">なし</span>
              )}
            </div>
            <BetSummaryFooter
              betCount={points}
              totalAmount={totalCost}
              amount={amount}
              balance={balance}
              isClosed={false}
              isPending={isPending}
              onAmountChange={setAmount}
              onSubmit={handleCheck}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="投票内容の確認"
        description={
          <>
            以下の内容で投票します。よろしいですか？
            <span className="mt-4 block space-y-3 text-left">
              {races.map((race) => {
                const raceSelections = selections[race.id] || [];
                const selectedHorses = race.entries
                  .filter((e) => raceSelections.includes(e.horse.id))
                  .sort((a, b) => (a.horseNumber || 0) - (b.horseNumber || 0));

                return (
                  <span key={race.id} className="flex flex-col gap-1 border-b border-gray-100 pb-2 last:border-0">
                    <span className="text-sm font-semibold text-gray-600">
                      {race.raceNumber}R {race.name}
                    </span>
                    <span className="flex flex-wrap gap-1.5 pl-2">
                      {selectedHorses.map((entry) => (
                        <span
                          key={entry.id}
                          className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-sm"
                        >
                          <span
                            className={`inline-flex h-4 w-4 items-center justify-center rounded text-sm font-semibold shadow-sm ${getBracketColor(entry.bracketNumber || 0)}`}
                          >
                            {entry.bracketNumber || '-'}
                          </span>
                          <span className="font-mono font-semibold text-gray-900">{entry.horseNumber}</span>
                          <span className="text-sm text-gray-600">{entry.horse.name}</span>
                        </span>
                      ))}
                      {selectedHorses.length === 0 && <span className="text-sm text-red-500">未選択</span>}
                    </span>
                  </span>
                );
              })}
            </span>
            <span className="mt-4 block space-y-2 rounded-lg bg-gray-50 p-4 text-left">
              <span className="flex justify-between text-sm">
                <span className="text-gray-500">点数</span>
                <span className="font-semibold">{points}点</span>
              </span>
              <span className="flex justify-between text-sm">
                <span className="text-gray-500">1点あたり</span>
                <span className="font-semibold">{amount}円</span>
              </span>
              <span className="flex justify-between border-t border-gray-200 pt-2 text-lg font-semibold text-gray-900">
                <span>合計金額</span>
                <span className="text-indigo-600">{totalCost.toLocaleString('ja-JP')}円</span>
              </span>
            </span>
          </>
        }
        confirmLabel="投票を確定する"
        confirmVariant="primary"
        onConfirm={handleConfirmSubmit}
      />
    </>
  );
}
