'use client';

import { calculateBet5PayoutAction, closeBet5EventAction, updateBet5InitialPotAction } from '@/features/betting';
import { BET5_STATUS_LABELS } from '@/shared/constants/status';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Label,
  NumericInput,
} from '@/shared/ui';
import { lookup } from '@/shared/utils/lookup';
import { Calculator, ExternalLink, Info, Loader2, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

interface Bet5Event {
  id: string;
  eventId: string;
  status: 'SCHEDULED' | 'CLOSED' | 'FINALIZED' | 'CANCELLED';
  initialPot: number;
}

interface Bet5ManageCardProps {
  bet5Event: Bet5Event;
  eventId: string;
  distributeAmount: number;
  targetRaces: Array<{
    id: string;
    raceNumber: number | null;
    name: string;
    status: string;
    entryCount: number;
  }>;
  raceLiveStats: Array<{
    raceId: string;
    raceNumber: number | null;
    raceName: string;
    entryCount: number;
    hitCount: number | null;
    consecutiveHitCount: number | null;
  }>;
}

export function Bet5ManageCard({
  bet5Event,
  eventId,
  distributeAmount,
  targetRaces,
  raceLiveStats,
}: Bet5ManageCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [initialPot, setInitialPot] = useState(bet5Event.initialPot);

  const canEditPot = bet5Event.status !== 'FINALIZED';
  const canCalculatePayout =
    targetRaces.length === 5 &&
    targetRaces.every((race) => race.status === 'RANKING_CONFIRMED' || race.status === 'FINALIZED');
  const raceLiveStatByRaceId = new Map(raceLiveStats.map((stat) => [stat.raceId, stat]));

  const handleUpdatePot = () => {
    if (!canEditPot) {
      return;
    }

    startTransition(async () => {
      try {
        await updateBet5InitialPotAction(bet5Event.id, eventId, initialPot);
        toast.success('プール金額を更新しました');
        router.refresh();
      } catch (error) {
        toast.error('プール金額の更新に失敗しました');
        console.error(error);
      }
    });
  };

  const handleClose = async () => {
    try {
      await closeBet5EventAction(bet5Event.id, eventId);
      toast.success('締め切りました');
      router.refresh();
    } catch (error) {
      toast.error('締め切りに失敗しました');
      console.error(error);
      // throw でダイアログを開いたままにし、再実行の判断を管理者に委ねる
      throw error;
    }
  };

  const handleCalculate = async () => {
    try {
      const result = await calculateBet5PayoutAction(bet5Event.id, eventId);
      if (result.success) {
        toast.success(`集計完了: 的中${result.winCount}件, 100円あたり配当${result.dividend}円`);
      } else {
        toast.error(`失敗: ${result.message}`);
      }
      router.refresh();
    } catch (error) {
      toast.error('計算処理に失敗しました');
      console.error(error);
      throw error;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>BET5管理</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bet5Event.status === 'SCHEDULED' && (
          <div className="flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            <Info className="mr-2 h-4 w-4 shrink-0" />
            設定済みレースが出走する前にBET5を締め切ってください。
          </div>
        )}

        <div className="rounded-lg bg-gray-50 p-4">
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="font-medium text-gray-900">ステータス</p>
              <p className="text-sm text-gray-500">
                {lookup(BET5_STATUS_LABELS, bet5Event.status) || bet5Event.status}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">初期プール</p>
              <p className="text-sm text-gray-500">{bet5Event.initialPot.toLocaleString('ja-JP')}円</p>
            </div>
            <div>
              <p className="font-medium text-gray-900">イベント初期支給額</p>
              <p className="text-sm text-gray-500">{distributeAmount.toLocaleString('ja-JP')}円</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bet5-initial-pot">プール金額（払い戻し実行まで編集可）</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-center">
              <NumericInput
                id="bet5-initial-pot"
                min={0}
                value={initialPot}
                onChange={setInitialPot}
                disabled={!canEditPot || isPending}
              />
              <Button
                variant="outline"
                onClick={handleUpdatePot}
                className="shrink-0 whitespace-nowrap"
                disabled={!canEditPot || isPending || initialPot === bet5Event.initialPot}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                プールを更新
              </Button>
            </div>
            {!canEditPot && <p className="text-sm text-gray-500">払い戻し完了後はプールを変更できません。</p>}
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <p className="mb-2 font-medium text-gray-900">設定済み対象レース</p>
          <ul className="space-y-1.5 text-sm text-gray-700">
            {targetRaces.map((race) => {
              const stat = raceLiveStatByRaceId.get(race.id);
              return (
                <li
                  key={race.id}
                  className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  <span className="font-semibold">{race.raceNumber ? `${race.raceNumber}R` : '-'}</span>
                  <span className="text-gray-300">|</span>
                  <Link
                    href={`/admin/races/${race.id}`}
                    className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 hover:underline"
                  >
                    <span>{race.name}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-600">{race.entryCount}頭</span>
                  {stat && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-600">的中：{stat.hitCount ?? '-'}</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-600">連続的中：{stat.consecutiveHitCount ?? '-'}</span>
                    </>
                  )}
                  <Badge variant="status" label={race.status} className="ml-auto" />
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {bet5Event.status === 'SCHEDULED' && (
            <ConfirmDialog
              trigger={
                <Button variant="destructive" disabled={isPending}>
                  <Lock className="mr-2 h-4 w-4" />
                  受付を締め切る
                </Button>
              }
              title="BET5を締め切りますか？"
              description="ユーザーはこれ以降投票できなくなります。"
              confirmLabel="締め切る"
              onConfirm={handleClose}
            />
          )}

          {bet5Event.status === 'CLOSED' && (
            <ConfirmDialog
              trigger={
                <Button variant="secondary" disabled={isPending || !canCalculatePayout}>
                  <Calculator className="mr-2 h-4 w-4" />
                  配当計算・払い戻し実行
                </Button>
              }
              title="配当計算・払い戻しを実行しますか？"
              description="的中を集計し、各ユーザーへ払い戻します。この操作は取り消せません。"
              confirmLabel="実行する"
              onConfirm={handleCalculate}
            />
          )}

          {bet5Event.status === 'CLOSED' && !canCalculatePayout && (
            <div className="ml-2 flex items-center text-sm font-medium text-gray-500">
              <Info className="mr-1 h-4 w-4" />
              全対象レースが「着順確定」または「払戻確定」になると実行できます。
            </div>
          )}

          {bet5Event.status === 'SCHEDULED' && (
            <div className="ml-2 flex items-center text-sm font-medium text-gray-500">
              <Info className="mr-1 h-4 w-4" />
              払い戻しは締め切り後に実行できます。
            </div>
          )}

          {bet5Event.status === 'FINALIZED' && (
            <div className="flex items-center font-medium text-green-600">
              <Calculator className="mr-2 h-4 w-4" />
              集計・払い戻し完了済み
            </div>
          )}
        </div>
        {isPending && (
          <div className="flex items-center text-sm text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            処理中...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
