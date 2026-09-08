'use client';

import { formatRaceLabel } from '@/entities/race/lib/label';
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
import { createBet5EventAction } from '../actions';

interface Race {
  id: string;
  raceNumber: number | null;
  name: string;
}

interface Bet5ConfigFormProps {
  eventId: string;
  eventName: string;
  /** 初期プール入力欄の初期値。イベントのデフォルト配布金額の10倍を渡す想定 */
  defaultInitialPot: number;
  races: Race[];
}

/** レース ID が 5 件ちょうどかを判定する。BET5 は 5 レース組でしか作れないため、件数を型へ持ち上げる */
function isFiveRaceIds(raceIds: string[]): raceIds is [string, string, string, string, string] {
  return raceIds.length === 5;
}

export function Bet5ConfigForm({ eventId, eventName, defaultInitialPot, races }: Bet5ConfigFormProps) {
  const router = useRouter();
  const [initialPot, setInitialPot] = useState(defaultInitialPot);
  const [selectedRaces, setSelectedRaces] = useState<string[]>([]);

  const sortedRaces = [...races].sort((a, b) => (a.raceNumber ?? 0) - (b.raceNumber ?? 0));
  const selectedInRaceOrder = sortedRaces.filter((race) => selectedRaces.includes(race.id));

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
    const raceIds = selectedInRaceOrder.map((race) => race.id);
    if (!isFiveRaceIds(raceIds)) {
      toast.error('5つのレースを選択してください');
      return;
    }

    const result = await createBet5EventAction({
      eventId,
      raceIds,
      initialPot,
    });
    if (!result.success) {
      toast.error(result.error);
      // throw でダイアログを開いたままにし、再実行の判断を管理者に委ねる
      throw new Error(result.error);
    }
    toast.success('BET5を作成しました');
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">BET5設定</CardTitle>
        <CardDescription>対象イベント: {eventName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="text-sm text-gray-700">対象レース選択</legend>
            <p className="text-text-sub text-sm">
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
                      <span className="text-sm font-semibold">{formatRaceLabel(race)}</span>
                      {legNumber > 0 && (
                        <Badge label={`第${legNumber}戦`} className="bg-turf-600 border-0 text-white" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-text-sub text-sm">選択済み: {selectedRaces.length} / 5</p>
            {selectedInRaceOrder.length > 0 && (
              <p className="text-sm text-gray-700">
                {selectedInRaceOrder.map((race, index) => `第${index + 1}戦 ${formatRaceLabel(race)}`).join(' → ')}
              </p>
            )}
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="initialPot">初期プール</Label>
            <NumericInput id="initialPot" value={initialPot} onChange={setInitialPot} min={0} />
            <p className="text-text-sub text-sm">
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
                      第{index + 1}戦 {formatRaceLabel(race)}
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
