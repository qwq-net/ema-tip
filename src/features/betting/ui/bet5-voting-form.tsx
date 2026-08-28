'use client';

import { BetSummaryFooter, placeBet5BetAction } from '@/features/betting';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import { getBracketColor } from '@/shared/utils/bracket';
import { cn } from '@/shared/utils/cn';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

interface RaceWithEntries {
  id: string;
  raceNumber: number | null;
  name: string;
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

  const handleConfirmSubmit = () => {
    startTransition(async () => {
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
        router.push('/mypage/sokubet');
      } catch (error) {
        toast.error('投票に失敗しました');
        console.error(error);
      }
    });
  };

  const activeRace = races[activeTab];
  const activeRaceSelections = selections[activeRace.id] || [];

  return (
    <>
      <div className="space-y-6 pb-32">
        <div className="flex overflow-x-auto border-b border-gray-200">
          {races.map((race, index) => {
            const isSelected = index === activeTab;
            const selectionCount = selections[race.id]?.length || 0;
            return (
              <button
                key={race.id}
                onClick={() => setActiveTab(index)}
                className={cn(
                  'relative flex min-w-[80px] flex-1 flex-col items-center justify-center gap-1 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 focus:outline-none',
                  isSelected ? 'text-primary border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500'
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

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
                          ? 'bg-red-50/50 text-gray-400 line-through'
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

        <div className="fixed bottom-0 left-0 z-50 w-full border-t border-gray-200 bg-white p-4 shadow-lg md:relative md:border-none md:bg-transparent md:p-0 md:shadow-none">
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
                <span className="text-gray-400">なし</span>
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

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>投票内容の確認</DialogTitle>
            <DialogDescription>以下の内容で投票します。よろしいですか？</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {races.map((race) => {
                const raceSelections = selections[race.id] || [];
                const selectedHorses = race.entries
                  .filter((e) => raceSelections.includes(e.horse.id))
                  .sort((a, b) => (a.horseNumber || 0) - (b.horseNumber || 0));

                return (
                  <div key={race.id} className="flex flex-col gap-1 border-b border-gray-100 pb-2 last:border-0">
                    <div className="text-sm font-semibold text-gray-600">
                      {race.raceNumber}R {race.name}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-2">
                      {selectedHorses.map((entry) => (
                        <div
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
                        </div>
                      ))}
                      {selectedHorses.length === 0 && <span className="text-sm text-red-500">未選択</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 rounded-lg bg-gray-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">点数</span>
                <span className="font-semibold">{points}点</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">1点あたり</span>
                <span className="font-semibold">{amount}円</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-semibold">
                <span>合計金額</span>
                <span className="text-indigo-600">{totalCost.toLocaleString('ja-JP')}円</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              キャンセル
            </Button>
            <Button onClick={handleConfirmSubmit} disabled={isPending} className="w-full sm:w-auto">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              投票を確定する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
