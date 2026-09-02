'use client';

import { createBet5EventAction } from '@/features/betting';
import { toast } from '@/shared/lib/toast';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Label,
  NumericInput,
} from '@/shared/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Race = {
  id: string;
  raceNumber: number | null;
  name: string;
};

interface Bet5ConfigFormProps {
  eventId: string;
  eventName: string;
  /** 初期プール入力欄の初期値。イベントのデフォルト配布金額の10倍を渡す想定 */
  defaultInitialPot: number;
  races: Race[];
}

export function Bet5ConfigForm({ eventId, eventName, defaultInitialPot, races }: Bet5ConfigFormProps) {
  const router = useRouter();
  const [initialPot, setInitialPot] = useState(defaultInitialPot);
  const [selectedRaces, setSelectedRaces] = useState<string[]>([]);

  const sortedRaces = [...races].sort((a, b) => (a.raceNumber || 0) - (b.raceNumber || 0));
  const selectedInRaceOrder = sortedRaces.filter((race) => selectedRaces.includes(race.id));
  const raceLabel = (race: Race) => `${race.raceNumber ? `${race.raceNumber}R` : 'Ex'} ${race.name}`;

  const handleRaceSelection = (raceId: string) => {
    if (selectedRaces.includes(raceId)) {
      setSelectedRaces(selectedRaces.filter((id) => id !== raceId));
    } else {
      if (selectedRaces.length >= 5) {
        toast.error('選択できるのは5レースまでです');
        return;
      }
      setSelectedRaces([...selectedRaces, raceId]);
    }
  };

  const handleCreate = async () => {
    if (selectedRaces.length !== 5) {
      toast.error('5つのレースを選択してください');
      return;
    }

    const sortedSelectedIds = selectedInRaceOrder.map((race) => race.id);

    try {
      await createBet5EventAction({
        eventId,
        // SAFETY: handleCreate 冒頭のガードで選択数が 5 件ちょうどであることを確認済み
        raceIds: sortedSelectedIds as [string, string, string, string, string],
        initialPot,
      });
      toast.success('BET5を作成しました');
      router.refresh();
    } catch (error) {
      toast.error('作成に失敗しました');
      console.error(error);
      // throw でダイアログを開いたままにし、再実行の判断を管理者に委ねる
      throw error;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>BET5設定</CardTitle>
        <CardDescription>対象イベント: {eventName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>対象レース選択</Label>
            <p className="text-sm text-gray-500">
              5レースを選択してください。選択したレースはレース番号順に第1〜5戦へ割り当てられます。
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sortedRaces.map((race) => {
                const legNumber = selectedInRaceOrder.findIndex((selected) => selected.id === race.id) + 1;
                return (
                  <button
                    key={race.id}
                    type="button"
                    aria-pressed={legNumber > 0}
                    className={`rounded-control border p-3 text-left transition hover:bg-gray-50 ${
                      legNumber > 0 ? 'border-turf-500 bg-turf-50 ring-turf-500 ring-1' : 'border-gray-200'
                    }`}
                    onClick={() => handleRaceSelection(race.id)}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-sm font-medium">{raceLabel(race)}</span>
                      {legNumber > 0 && (
                        <Badge label={`第${legNumber}戦`} className="bg-turf-600 border-0 text-white" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-gray-500">選択済み: {selectedRaces.length} / 5</p>
            {selectedInRaceOrder.length > 0 && (
              <p className="text-sm font-medium text-gray-700">
                {selectedInRaceOrder.map((race, index) => `第${index + 1}戦 ${raceLabel(race)}`).join(' → ')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialPot">初期プール</Label>
            <NumericInput id="initialPot" value={initialPot} onChange={setInitialPot} min={0} />
            <p className="text-sm text-gray-500">
              売上によるプール金額とは別に、今回特別に設定するボーナス金額です。初期値はイベントの配布金額の10倍です。
            </p>
          </div>

          <ConfirmDialog
            trigger={
              <Button type="button" disabled={selectedRaces.length !== 5}>
                BET5を作成する
              </Button>
            }
            title="BET5を作成しますか？"
            description={
              <>
                作成後は対象レースを変更できません。初期プールは払戻確定まで変更できます。
                <span className="mt-3 block space-y-1">
                  {selectedInRaceOrder.map((race, index) => (
                    <span key={race.id} className="block">
                      第{index + 1}戦 {raceLabel(race)}
                    </span>
                  ))}
                </span>
                <span className="mt-3 block">初期プール: {initialPot.toLocaleString()}</span>
              </>
            }
            confirmLabel="作成する"
            onConfirm={handleCreate}
          />
        </div>
      </CardContent>
    </Card>
  );
}
