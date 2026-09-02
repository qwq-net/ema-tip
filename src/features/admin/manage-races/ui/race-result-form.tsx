'use client';

import { fetchNetkeibaRaceResult } from '@/features/admin/import-race/actions';
import type { NetkeibaRaceResult } from '@/features/admin/import-race/model/types';
import { AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { toast } from '@/shared/lib/toast';
import { Badge, Button, ConfirmDialog } from '@/shared/ui';
import { FormattedDate } from '@/shared/ui/formatted-date';
import { getBracketColor } from '@/shared/utils/bracket';
import { cn } from '@/shared/utils/cn';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  GripVertical,
  Info,
  ListOrdered,
  Loader2,
  RotateCcw,
  Settings2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { closeRace, finalizePayout, finalizeRace, reopenRace } from '../actions';
import { resetRaceResults } from '../actions/revert';
import { KitchenTimer } from './kitchen-timer';

interface Entry {
  id: string;
  horseNumber: number | null;
  horseName: string;
  bracketNumber: number | null;
  jockey?: string | null;
  odds?: number | null;
}

interface RaceResultFormProps {
  raceId: string;
  entries: Entry[];
  canFinalizePayout?: boolean;
  showBet5CloseReminder?: boolean;
  race: {
    id: string;
    eventId: string;
    date: string;
    location: string;
    name: string;
    raceNumber: number | null;
    status: string;
    surface: '芝' | 'ダート';
    distance: number;
    condition: '良' | '稍重' | '重' | '不良' | null;
    closingAt: string | null;
    netkeibaUrl?: string | null;
    fixedOddsMode: boolean;
  };
}

const getRankStyles = (position: number) => {
  switch (position) {
    case 1:
      return 'bg-amber-100 text-amber-700 ring-amber-200 border-amber-200';
    case 2:
      return 'bg-slate-100 text-slate-700 ring-slate-200 border-slate-200';
    case 3:
      return 'bg-orange-100 text-orange-700 ring-orange-200 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-100';
  }
};

function HorseInfo({ horseName, jockey, odds }: { horseName: string; jockey?: string | null; odds?: number | null }) {
  return (
    <>
      <span className="truncate text-sm font-semibold text-gray-900">{horseName}</span>
      {jockey && (
        <>
          <span className="text-text-sub shrink-0 text-sm">/</span>
          <span className="shrink-0 text-sm text-gray-500">{jockey}</span>
        </>
      )}
      {odds != null && (
        <>
          <span className="text-text-sub shrink-0 text-sm">/</span>
          <span className="shrink-0 text-sm font-semibold text-gray-600">オッズ: {odds.toFixed(1)}倍</span>
        </>
      )}
    </>
  );
}

function EntryBadges({ entry }: { entry: Entry }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'rounded-chip flex h-6 w-6 items-center justify-center text-sm font-semibold ring-1 ring-black/5',
          getBracketColor(entry.bracketNumber)
        )}
      >
        {entry.bracketNumber || '?'}
      </span>
      <span className="text-primary bg-primary/10 ring-primary/10 rounded-chip flex h-6 w-6 items-center justify-center text-sm font-semibold ring-1">
        {entry.horseNumber || '?'}
      </span>
    </div>
  );
}

function ReadOnlyEntryList({ entries }: { entries: Entry[] }) {
  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="rounded-surface flex items-center gap-3 border border-gray-100 bg-gray-50/50 p-2"
        >
          <EntryBadges entry={entry} />
          <div className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
            <HorseInfo horseName={entry.horseName} jockey={entry.jockey} odds={entry.odds} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SortableResultItem({ entry, position }: { entry: Entry; position: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group rounded-surface relative flex cursor-grab items-center gap-3 border border-gray-200 bg-white p-2 ring-offset-2 transition duration-200 select-none active:cursor-grabbing',
        isDragging ? 'ring-primary/40 opacity-0 ring-2' : 'hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      <div
        className={cn(
          'rounded-control flex h-8 w-8 shrink-0 items-center justify-center border text-lg font-semibold transition-colors',
          getRankStyles(position)
        )}
      >
        {position}
      </div>

      <div className="p-1 text-gray-300 transition-colors group-hover:text-gray-500">
        <GripVertical className="h-5 w-5" />
      </div>

      <EntryBadges entry={entry} />

      <div className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
        <HorseInfo horseName={entry.horseName} jockey={entry.jockey} odds={entry.odds} />
      </div>
    </div>
  );
}

export function RaceResultForm({
  raceId,
  entries: initialEntries,
  race,
  canFinalizePayout,
  showBet5CloseReminder,
}: RaceResultFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sortedEntries, setSortedEntries] = useState(initialEntries);

  // リセットや他所での確定でサーバー側の並びが変わったら、ドラッグ中のローカル状態を破棄して追従する。
  // 内容が同じ再レンダーでは並び替え作業を保持したいため、参照ではなく内容で比較する
  const initialSignature = JSON.stringify(initialEntries.map((entry) => entry.id));
  const [prevSignature, setPrevSignature] = useState(initialSignature);
  if (prevSignature !== initialSignature) {
    setPrevSignature(initialSignature);
    setSortedEntries(initialEntries);
  }
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPayoutMoving, setIsPayoutMoving] = useState(false);
  const [netkeibaResult, setNetkeibaResult] = useState<NetkeibaRaceResult | null>(null);
  const [showNetkeibaConfirm, setShowNetkeibaConfirm] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const isChanged = JSON.stringify(sortedEntries.map((e) => e.id)) !== JSON.stringify(initialEntries.map((e) => e.id));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setSortedEntries((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleReset = () => {
    setSortedEntries(initialEntries);
    toast.message('初期状態にリセットしました');
  };

  const handleManualClose = () => {
    startTransition(async () => {
      try {
        await closeRace(raceId);
        toast.success('受付を終了しました');
        router.refresh();
      } catch {
        toast.error('エラーが発生しました');
      }
    });
  };

  const handleReopen = () => {
    startTransition(async () => {
      try {
        await reopenRace(raceId);
        toast.success('受付を再開しました');
        router.refresh();
      } catch {
        toast.error('エラーが発生しました');
      }
    });
  };

  const handlePayoutFinalize = async () => {
    setIsPayoutMoving(true);
    try {
      await finalizePayout(raceId);
      toast.success('払い戻し確定通知を送信しました', {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('エラーが発生しました');
    } finally {
      setIsPayoutMoving(false);
    }
  };

  const handleServerReset = async () => {
    try {
      await resetRaceResults(raceId);
      toast.success('着順設定を初期状態にリセットしました');
      router.refresh();
    } catch (error) {
      toast.error('リセットに失敗しました');
      console.error(error);
      // throw でダイアログを開いたままにし、再実行の判断を管理者に委ねる
      throw error;
    }
  };

  const handleSubmit = async () => {
    const results = sortedEntries.map((entry, index) => ({
      entryId: entry.id,
      finishPosition: index + 1,
    }));

    try {
      const result = await finalizeRace(raceId, results);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('着順を確定し、払い戻し計算が完了しました', {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
      router.refresh();
    } catch (error) {
      toast.error('エラーが発生しました');
      console.error(error);
      throw error;
    }
  };

  const handleFetchNetkeibaResult = () => {
    startTransition(async () => {
      try {
        const result = await fetchNetkeibaRaceResult(raceId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        if (!result.data) {
          toast.info('レース結果はまだ確定していません。しばらく後に再試行してください。');
          return;
        }
        setNetkeibaResult(result.data);
        setShowNetkeibaConfirm(true);
      } catch {
        toast.error('エラーが発生しました');
      }
    });
  };

  const handleNetkeibaFinalize = async () => {
    if (!netkeibaResult) return;

    const results = netkeibaResult.finishOrder
      .map((horseNumber, index) => {
        const entry = initialEntries.find((e) => e.horseNumber === horseNumber);
        return entry ? { entryId: entry.id, finishPosition: index + 1 } : null;
      })
      .filter((r): r is { entryId: string; finishPosition: number } => r !== null);

    try {
      const result = await finalizeRace(raceId, results, netkeibaResult.payouts);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('着順を確定し、Netkeibaオッズで払い戻し計算が完了しました', {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
      router.refresh();
    } catch (error) {
      toast.error('エラーが発生しました');
      console.error(error);
      throw error;
    }
  };

  const activeEntry = activeId ? sortedEntries.find((e) => e.id === activeId) : null;
  const activePosition = activeEntry ? sortedEntries.findIndex((e) => e.id === activeEntry.id) + 1 : 0;
  const entryCount = initialEntries.length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-surface border border-gray-100 bg-white p-6 lg:col-span-2">
        <div className="mb-4 border-b border-gray-50 pb-4">
          <div className="flex items-center justify-between gap-2">
            <AdminSectionTitle icon={ListOrdered}>着順設定</AdminSectionTitle>
            {!race.fixedOddsMode && isChanged && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-text-sub h-auto p-0 font-semibold hover:bg-transparent hover:text-gray-600"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                リセット
              </Button>
            )}
          </div>
          {!race.fixedOddsMode && race.status === 'CLOSED' && (
            <p className="text-text-sub mt-2 flex items-center gap-1.5 text-xs font-semibold">
              <Info className="h-3.5 w-3.5" />
              ドラッグして着順を並び替えてください
            </p>
          )}
        </div>

        {race.fixedOddsMode && race.status === 'CLOSED' ? (
          <div className="space-y-6">
            <div className="text-text-sub flex flex-col items-center justify-center pt-6 pb-2 text-center">
              <Loader2 className="mb-4 h-10 w-10 animate-spin opacity-20" />
              <p className="text-sm font-semibold">
                Netkeibaの実際のレース結果が確定するまでお待ちください。
                <br />
                確定後、右のボタンから結果を取得して着順を確定してください。
              </p>
            </div>
            <ReadOnlyEntryList entries={initialEntries} />
          </div>
        ) : race.status === 'CLOSED' ? (
          <DndContext
            id={`result-dnd-${raceId}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-2">
              <SortableContext items={sortedEntries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                {sortedEntries.map((entry, index) => (
                  <SortableResultItem key={entry.id} entry={entry} position={index + 1} />
                ))}
              </SortableContext>
            </div>

            <DragOverlay adjustScale={false}>
              {activeEntry && (
                <div className="border-primary ring-primary/10 rounded-surface flex items-center gap-3 border-2 bg-white p-2 ring-4">
                  <div
                    className={cn(
                      'rounded-control flex h-8 w-8 shrink-0 items-center justify-center border text-lg font-semibold',
                      getRankStyles(activePosition)
                    )}
                  >
                    {activePosition}
                  </div>
                  <GripVertical className="text-primary h-4 w-4" />
                  <EntryBadges entry={activeEntry} />
                  <div className="flex min-w-0 items-center gap-1.5">
                    <HorseInfo horseName={activeEntry.horseName} jockey={activeEntry.jockey} odds={activeEntry.odds} />
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="space-y-6">
            <div className="text-text-sub flex flex-col items-center justify-center pt-6 pb-2 text-center">
              <Settings2 className="mb-4 h-12 w-12 opacity-20" />
              <p className="text-sm font-semibold">
                受付が終了すると着順の操作が可能になります。
                <br />
                「自動タイマー」による締め切りか、「手動締切」を行ってください。
              </p>
              <div className="mt-6">
                <KitchenTimer
                  raceId={raceId}
                  initialClosingAt={race.closingAt ? new Date(race.closingAt) : null}
                  status={race.status}
                />
              </div>
            </div>
            <ReadOnlyEntryList entries={initialEntries} />
          </div>
        )}
      </div>

      <div className="space-y-6">
        {showBet5CloseReminder && (
          <div className="rounded-surface flex items-center justify-between gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
            <div className="flex items-center font-medium text-amber-800">
              <Info className="mr-1.5 h-4 w-4 shrink-0" />
              出走前にBET5を締め切ってください。
            </div>
            <Link
              href={`/admin/events/${race.eventId}/bet5`}
              className="inline-flex shrink-0 items-center font-semibold text-amber-900 hover:underline"
            >
              BET5管理へ
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        <div className="rounded-surface border border-gray-100 bg-white p-6">
          <div className="mb-2 border-b border-gray-50 pb-4">
            <AdminSectionTitle icon={Settings2}>レース情報</AdminSectionTitle>
          </div>

          <div className="divide-y divide-gray-50 text-sm">
            <div className="flex items-center justify-between py-2">
              <span className="font-medium text-gray-500">レース作成方法</span>
              <span className="font-semibold text-gray-900">{race.netkeibaUrl ? 'Netkeibaから' : '手動'}</span>
            </div>
            {race.fixedOddsMode && (
              <div className="flex items-center justify-between py-2">
                <span className="font-medium text-gray-500">オッズ設定</span>
                <span className="text-turf-700 font-semibold">固定オッズ</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2">
              <span className="font-medium text-gray-500">ステータス</span>
              <Badge variant="status" label={race.status} />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-medium text-gray-500">出走馬数</span>
              <span className="font-semibold text-gray-900">{entryCount}頭</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-medium text-gray-500">受付終了予定</span>
              <span className="font-semibold text-gray-900">
                {race.closingAt ? (
                  <FormattedDate
                    date={race.closingAt}
                    options={{ month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }}
                  />
                ) : (
                  '手動'
                )}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-medium text-gray-500">コース</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="surface" label={race.surface} />
                <span className="font-semibold text-gray-700">{race.distance}m</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-medium text-gray-500">馬場状態</span>
              <Badge variant="condition" label={race.condition} />
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {race.status === 'SCHEDULED' && (
              <Button
                variant="outline"
                className="w-full py-6 text-sm font-semibold"
                onClick={handleManualClose}
                disabled={isPending}
              >
                手動で受付を終了する
              </Button>
            )}

            {race.status === 'CLOSED' && (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="border-turf-100 text-turf-700 hover:bg-turf-50 w-full py-4 text-sm font-semibold"
                  onClick={handleReopen}
                  disabled={isPending || canFinalizePayout}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  受付を再開する
                </Button>

                {race.fixedOddsMode ? (
                  <>
                    {!canFinalizePayout && (
                      <div className="bg-turf-50 text-turf-800 ring-turf-100 rounded-control flex items-start gap-1.5 px-3 py-2 text-sm font-medium ring-1">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Netkeiba上で結果が確定するまで確定はできません
                      </div>
                    )}
                    <Button
                      className="relative w-full py-6 text-lg font-semibold active:scale-[0.98]"
                      onClick={handleFetchNetkeibaResult}
                      disabled={isPending || isPayoutMoving || canFinalizePayout}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          取得中...
                        </>
                      ) : canFinalizePayout ? (
                        '着順確定済み'
                      ) : (
                        '確定'
                      )}
                    </Button>

                    <ConfirmDialog
                      open={showNetkeibaConfirm}
                      onOpenChange={setShowNetkeibaConfirm}
                      icon={
                        <div className="bg-turf-50 text-turf-600 mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                          <CheckCircle2 className="h-8 w-8" />
                        </div>
                      }
                      title="Netkeibaの結果で確定しますか？"
                      description={
                        <>
                          Netkeibaの実際の払い戻しオッズで計算されます。
                          <div className="rounded-surface mt-4 divide-y divide-gray-100 border border-gray-100 bg-gray-50/50 p-4 font-semibold text-gray-900">
                            {netkeibaResult?.finishOrder.slice(0, 3).map((horseNumber, index) => {
                              const labels = ['1着', '2着', '3着'];
                              const colors = ['text-amber-600', 'text-slate-500', 'text-orange-600'];
                              const entry = initialEntries.find((e) => e.horseNumber === horseNumber);
                              return (
                                <div key={horseNumber} className="flex justify-between py-1">
                                  <span className={colors[index]}>{labels[index]}</span>
                                  <span>{entry?.horseName ?? `${horseNumber}番`}</span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      }
                      confirmLabel="確定する"
                      confirmVariant="primary"
                      onConfirm={handleNetkeibaFinalize}
                    />
                  </>
                ) : (
                  <ConfirmDialog
                    trigger={
                      <Button
                        className={cn(
                          'relative w-full py-6 text-lg font-semibold active:scale-[0.98]',
                          isChanged ? 'from-primary to-primary/80 bg-linear-to-br' : 'grayscale-50'
                        )}
                        disabled={isPending || isPayoutMoving || canFinalizePayout}
                      >
                        {canFinalizePayout ? '着順確定済み' : '着順を確定する'}
                        {isChanged && !isPending && (
                          <span className="absolute -top-1 -right-1 h-3 w-3 animate-ping rounded-full bg-white/40" />
                        )}
                      </Button>
                    }
                    icon={
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                        <AlertCircle className="h-8 w-8" />
                      </div>
                    }
                    title="着順を確定しますか？"
                    description={
                      <>
                        この操作を行うと、投票された馬券の払い戻し計算が実行されます。
                        <div className="rounded-surface mt-4 divide-y divide-gray-100 border border-gray-100 bg-gray-50/50 p-4 font-semibold text-gray-900">
                          <div className="flex justify-between py-1">
                            <span className="text-amber-600">1着</span>
                            <span>{sortedEntries[0]?.horseName}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-slate-500">2着</span>
                            <span>{sortedEntries[1]?.horseName}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-orange-600">3着</span>
                            <span>{sortedEntries[2]?.horseName}</span>
                          </div>
                        </div>
                      </>
                    }
                    confirmLabel="確定する"
                    confirmVariant="primary"
                    onConfirm={handleSubmit}
                  />
                )}
              </div>
            )}

            {canFinalizePayout && (
              <div className="space-y-3">
                <Button
                  className="relative w-full border-2 border-amber-500 bg-white py-6 text-lg font-semibold text-amber-600 hover:bg-amber-50"
                  onClick={handlePayoutFinalize}
                  disabled={isPayoutMoving || isPending}
                >
                  {isPayoutMoving ? '払い戻し処理中...' : '払い戻しを確定する'}
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      className="text-text-sub w-full text-sm font-semibold hover:text-red-500"
                      disabled={isPayoutMoving || isPending}
                    >
                      着順設定をリセットする
                    </Button>
                  }
                  icon={
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                      <AlertCircle className="h-8 w-8" />
                    </div>
                  }
                  title="着順設定をリセットしますか？"
                  description="確定済みの着順・払い戻しがリセットされます。この操作は元に戻せません。"
                  confirmLabel="リセットする"
                  onConfirm={handleServerReset}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
