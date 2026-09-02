'use client';

import { createBet5EventAction } from '@/features/betting';
import { Button, Card, CardContent, CardHeader, CardTitle, Label, NumericInput } from '@/shared/ui';
import { preventEnterSubmit } from '@/shared/utils/form';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

type Race = {
  id: string;
  raceNumber: number | null;
  name: string;
};

interface Bet5ConfigFormProps {
  eventId: string;
  races: Race[];
}

export function Bet5ConfigForm({ eventId, races }: Bet5ConfigFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [initialPot, setInitialPot] = useState(0);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedRaces.length !== 5) {
      toast.error('5つのレースを選択してください');
      return;
    }

    const sortedSelectedIds = selectedInRaceOrder.map((race) => race.id);

    startTransition(async () => {
      try {
        await createBet5EventAction({
          eventId,
          // SAFETY: handleSubmit 冒頭のガードで選択数が 5 件ちょうどであることを確認済み
          raceIds: sortedSelectedIds as [string, string, string, string, string],
          initialPot,
        });
        toast.success('BET5を作成しました');
        router.refresh();
      } catch (error) {
        toast.error('作成に失敗しました');
        console.error(error);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>BET5設定</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>対象レース選択</Label>
            <p className="text-sm text-gray-500">
              5レースを選択してください。選択したレースはレース番号順に第1〜5戦へ割り当てられます。
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sortedRaces.map((race) => {
                const legNumber = selectedInRaceOrder.findIndex((selected) => selected.id === race.id) + 1;
                return (
                  <div
                    key={race.id}
                    className={`cursor-pointer rounded-lg border p-3 transition-all hover:bg-gray-50 ${
                      legNumber > 0 ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200'
                    }`}
                    onClick={() => handleRaceSelection(race.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{raceLabel(race)}</span>
                      {legNumber > 0 && (
                        <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-semibold text-white">
                          第{legNumber}戦
                        </span>
                      )}
                    </div>
                  </div>
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
            <p className="text-sm text-gray-500">売上によるプール金額とは別に、今回特別に設定するボーナス金額です。</p>
          </div>

          <Button type="submit" disabled={isPending || selectedRaces.length !== 5}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            BET5を作成する
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
