'use client';

import { BET5_STATUS_LABELS } from '@/shared/constants/status';
import { toast } from '@/shared/lib/toast';
import {
  Alert,
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
import { calculateBet5PayoutAction, closeBet5EventAction, updateBet5InitialPotAction } from '../actions';

interface Bet5Event {
  id: string;
  eventId: string;
  status: 'SCHEDULED' | 'CLOSED' | 'FINALIZED';
  initialPot: number;
}

interface Bet5ManageCardProps {
  bet5Event: Bet5Event;
  eventId: string;
  distributeAmount: number;
  targetRaces: {
    id: string;
    raceNumber: number | null;
    name: string;
    status: string;
    entryCount: number;
  }[];
  raceLiveStats: {
    raceId: string;
    raceNumber: number | null;
    raceName: string;
    entryCount: number;
    hitCount: number | null;
    consecutiveHitCount: number | null;
  }[];
}

interface Bet5ActionRowProps {
  status: Bet5Event['status'];
  isPending: boolean;
  canCalculatePayout: boolean;
  onClose: () => Promise<void>;
  onCalculate: () => Promise<void>;
}

/**
 * BET5 の状態に応じた操作列。受付中は締切、締切後は配当計算、払戻後は完了表示を出す。
 * 実行できない状態では、その理由を操作の隣に添える。
 */
function Bet5ActionRow({ status, isPending, canCalculatePayout, onClose, onCalculate }: Bet5ActionRowProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {status === 'SCHEDULED' && (
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
          onConfirm={onClose}
        />
      )}

      {status === 'CLOSED' && (
        <ConfirmDialog
          trigger={
            <Button variant="secondary" disabled={isPending || !canCalculatePayout}>
              <Calculator className="mr-2 h-4 w-4" />
              配当計算・払戻実行
            </Button>
          }
          title="配当計算・払戻を実行しますか？"
          description="的中を集計し、各ユーザーへ払い戻します。この操作は取り消せません。"
          confirmLabel="実行する"
          onConfirm={onCalculate}
        />
      )}

      {status === 'CLOSED' && !canCalculatePayout && (
        <div className="text-text-sub ml-2 flex items-center text-sm">
          <Info className="mr-1 h-4 w-4" />
          全対象レースが「着順確定」または「払戻確定」になると実行できます。
        </div>
      )}

      {status === 'SCHEDULED' && (
        <div className="text-text-sub ml-2 flex items-center text-sm">
          <Info className="mr-1 h-4 w-4" />
          払戻は締切後に実行できます。
        </div>
      )}

      {status === 'FINALIZED' && (
        <div className="flex items-center font-semibold text-green-600">
          <Calculator className="mr-2 h-4 w-4" />
          集計・払戻完了済み
        </div>
      )}
    </div>
  );
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
      const result = await updateBet5InitialPotAction(bet5Event.id, eventId, initialPot);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('プール金額を更新しました');
      router.refresh();
    });
  };

  const handleClose = async () => {
    const result = await closeBet5EventAction(bet5Event.id, eventId);
    if (!result.success) {
      toast.error(result.error);
      // throw でダイアログを開いたままにし、再実行の判断を管理者に委ねる
      throw new Error(result.error);
    }
    toast.success('締め切りました');
    router.refresh();
  };

  const handleCalculate = async () => {
    const result = await calculateBet5PayoutAction(bet5Event.id, eventId);
    if (!result.success) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success(`集計完了: 的中${result.data.winCount}件, 100円あたり配当${result.data.dividend}円`);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">BET5管理</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bet5Event.status === 'SCHEDULED' && (
          <Alert variant="warning" icon={Info}>
            設定済みレースが出走する前にBET5を締め切ってください。
          </Alert>
        )}

        <div className="rounded-control bg-gray-50 p-4">
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-text-main font-semibold">ステータス</p>
              <p className="text-text-sub text-sm">
                {lookup(BET5_STATUS_LABELS, bet5Event.status) || bet5Event.status}
              </p>
            </div>
            <div>
              <p className="text-text-main font-semibold">初期プール</p>
              <p className="text-text-sub text-sm">{bet5Event.initialPot.toLocaleString('ja-JP')}円</p>
            </div>
            <div>
              <p className="text-text-main font-semibold">イベント初期支給額</p>
              <p className="text-text-sub text-sm">{distributeAmount.toLocaleString('ja-JP')}円</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bet5-initial-pot">プール金額</Label>
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
            {!canEditPot && <p className="text-text-sub text-sm">払戻完了後はプールを変更できません。</p>}
          </div>
        </div>

        <div className="rounded-control border border-gray-100 bg-white p-4">
          <p className="text-text-main mb-2 font-semibold">設定済み対象レース</p>
          <ul className="space-y-1.5 text-sm text-gray-700">
            {targetRaces.map((race) => {
              const stat = raceLiveStatByRaceId.get(race.id);
              return (
                <li
                  key={race.id}
                  className="rounded-control flex items-center gap-2 border border-gray-100 bg-gray-50 px-3 py-2"
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

        <Bet5ActionRow
          status={bet5Event.status}
          isPending={isPending}
          canCalculatePayout={canCalculatePayout}
          onClose={handleClose}
          onCalculate={handleCalculate}
        />
        {isPending && (
          <div className="text-text-sub flex items-center text-sm">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            処理中...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
