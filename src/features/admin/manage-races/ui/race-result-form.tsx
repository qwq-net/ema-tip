'use client';

import { fetchNetkeibaRaceResult } from '@/features/admin/import-race/actions';
import type { NetkeibaRaceResult } from '@/features/admin/import-race/model/types';
import { AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { medalRankClass } from '@/shared/constants/rank-medal';
import { toast } from '@/shared/lib/toast';
import { Badge, Button, Card, ConfirmDialog } from '@/shared/ui';
import { FormattedDate } from '@/shared/ui/formatted-date';
import { getBracketColor } from '@/shared/utils/bracket';
import { cn } from '@/shared/utils/cn';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { closestCenter, DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
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
import { useState, useTransition, type Dispatch, type ReactNode, type SetStateAction } from 'react';
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

// 着順設定画面が必要とするレースの情報。呼び出し側は取得結果をこの形へ変換して渡す
export interface RaceResultFormRace {
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
}

interface RaceResultFormProps {
  raceId: string;
  entries: Entry[];
  canFinalizePayout?: boolean | undefined;
  showBet5CloseReminder?: boolean;
  // サイドカラムのレース情報カードの下に差し込む追加カード
  sideChildren?: ReactNode;
  race: RaceResultFormRace;
}

// 並べ替えリストの着順マーカー。1〜3着は共通の金銀銅、4着以下はグレー
const getRankStyles = (position: number) => {
  const medal = medalRankClass(position);
  return medal ? `${medal} border-transparent` : 'bg-gray-100 text-gray-600 border-gray-100';
};

function HorseInfo({
  horseName,
  jockey,
  odds,
}: {
  horseName: string;
  jockey?: string | null | undefined;
  odds?: number | null | undefined;
}) {
  return (
    <>
      <span className="text-text-main truncate text-sm font-semibold">{horseName}</span>
      {jockey && (
        <>
          <span className="text-text-sub shrink-0 text-sm">/</span>
          <span className="text-text-sub shrink-0 text-sm">{jockey}</span>
        </>
      )}
      {odds !== null && odds !== undefined && (
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
        {entry.bracketNumber ?? '?'}
      </span>
      <span className="text-primary bg-primary/10 ring-primary/10 rounded-chip flex h-6 w-6 items-center justify-center text-sm font-semibold ring-1">
        {entry.horseNumber ?? '?'}
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

      <div className="group-hover:text-text-sub p-1 text-gray-300 transition-colors">
        <GripVertical className="h-5 w-5" />
      </div>

      <EntryBadges entry={entry} />

      <div className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
        <HorseInfo horseName={entry.horseName} jockey={entry.jockey} odds={entry.odds} />
      </div>
    </div>
  );
}

interface ResultOrderingPanelProps {
  raceId: string;
  race: RaceResultFormRace;
  entries: Entry[];
  sortedEntries: Entry[];
  setSortedEntries: Dispatch<SetStateAction<Entry[]>>;
  isChanged: boolean;
  onReset: () => void;
}

/**
 * 着順設定の左カラム。受付終了後だけ並べ替えを受け付け、それ以外は読み取り専用の一覧を出す。
 * 固定オッズのレースは Netkeiba の結果で確定するため、締切後も並べ替えさせない。
 */
function ResultOrderingPanel({
  raceId,
  race,
  entries,
  sortedEntries,
  setSortedEntries,
  isChanged,
  onReset,
}: ResultOrderingPanelProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

  const activeEntry = activeId ? sortedEntries.find((e) => e.id === activeId) : null;
  const activePosition = activeEntry ? sortedEntries.findIndex((e) => e.id === activeEntry.id) + 1 : 0;

  return (
    <Card className="p-6 lg:col-span-2">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <AdminSectionTitle icon={ListOrdered}>着順設定</AdminSectionTitle>
          {!race.fixedOddsMode && isChanged && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
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

      {race.status === 'CLOSED' &&
        (race.fixedOddsMode ? (
          <div className="space-y-6">
            <div className="text-text-sub flex flex-col items-center justify-center pt-6 pb-2 text-center">
              <Loader2 className="mb-4 h-10 w-10 animate-spin opacity-20" />
              <p className="text-sm font-semibold">
                Netkeibaの実際のレース結果が確定するまでお待ちください。
                <br />
                確定後、右のボタンから結果を取得して着順を確定してください。
              </p>
            </div>
            <ReadOnlyEntryList entries={entries} />
          </div>
        ) : (
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
        ))}
      {race.status !== 'CLOSED' && (
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
          <ReadOnlyEntryList entries={entries} />
        </div>
      )}
    </Card>
  );
}

interface NetkeibaFinalizeActionsProps {
  entries: Entry[];
  canFinalizePayout?: boolean | undefined;
  isPending: boolean;
  isPayoutMoving: boolean;
  netkeibaResult: NetkeibaRaceResult | null;
  showNetkeibaConfirm: boolean;
  onNetkeibaConfirmOpenChange: (open: boolean) => void;
  onFetchResult: () => void;
  onFinalize: () => Promise<void>;
}

/**
 * 固定オッズのレースを Netkeiba の結果で確定する操作。
 * 取得した上位3着を確認ダイアログに出してから確定させる。
 */
function NetkeibaFinalizeActions({
  entries,
  canFinalizePayout,
  isPending,
  isPayoutMoving,
  netkeibaResult,
  showNetkeibaConfirm,
  onNetkeibaConfirmOpenChange,
  onFetchResult,
  onFinalize,
}: NetkeibaFinalizeActionsProps) {
  // Netkeiba から結果を取得するボタンのラベル。着順が確定済みならボタンは押せないため、その旨を出す
  const netkeibaButtonLabel = canFinalizePayout ? '着順確定済み' : '確定';

  return (
    <>
      {!canFinalizePayout && (
        <div className="bg-turf-50 text-turf-800 ring-turf-100 rounded-control flex items-start gap-1.5 px-3 py-2 text-sm font-semibold ring-1">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Netkeiba上で結果が確定するまで確定はできません
        </div>
      )}
      <Button
        className="relative w-full py-6 text-lg font-semibold active:scale-[0.98]"
        onClick={onFetchResult}
        disabled={isPending || isPayoutMoving || canFinalizePayout}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            取得中...
          </>
        ) : (
          netkeibaButtonLabel
        )}
      </Button>

      <ConfirmDialog
        open={showNetkeibaConfirm}
        onOpenChange={onNetkeibaConfirmOpenChange}
        icon={
          <div className="bg-turf-50 text-turf-600 mb-4 flex h-14 w-14 items-center justify-center rounded-full">
            <CheckCircle2 className="h-8 w-8" />
          </div>
        }
        title="Netkeibaの結果で確定しますか？"
        description={
          <>
            Netkeibaの実際の払戻オッズで計算されます。
            <div className="rounded-surface text-text-main mt-4 divide-y divide-gray-100 border border-gray-100 bg-gray-50/50 p-4 font-semibold">
              {netkeibaResult?.finishOrder.slice(0, 3).map((horseNumber, index) => {
                const labels = ['1着', '2着', '3着'];
                const entry = entries.find((e) => e.horseNumber === horseNumber);
                return (
                  <div key={horseNumber} className="flex justify-between py-1">
                    <span className={cn('rounded-chip px-1.5 py-0.5 text-xs font-semibold', medalRankClass(index + 1))}>
                      {labels[index]}
                    </span>
                    <span>{entry?.horseName ?? `${horseNumber}番`}</span>
                  </div>
                );
              })}
            </div>
          </>
        }
        confirmLabel="確定する"
        confirmVariant="primary"
        onConfirm={onFinalize}
      />
    </>
  );
}

interface ManualFinalizeActionsProps {
  sortedEntries: Entry[];
  canFinalizePayout?: boolean | undefined;
  isPending: boolean;
  isPayoutMoving: boolean;
  isChanged: boolean;
  onFinalize: () => Promise<void>;
}

/** 手動で並べ替えた着順を確定する操作。確認ダイアログで上位3着を提示してから払戻計算へ進む。 */
function ManualFinalizeActions({
  sortedEntries,
  canFinalizePayout,
  isPending,
  isPayoutMoving,
  isChanged,
  onFinalize,
}: ManualFinalizeActionsProps) {
  return (
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
          この操作を行うと、購入された馬券の払戻計算が実行されます。
          <div className="rounded-surface text-text-main mt-4 divide-y divide-gray-100 border border-gray-100 bg-gray-50/50 p-4 font-semibold">
            {[1, 2, 3].map((position) => (
              <div key={position} className="flex justify-between py-1">
                <span className={cn('rounded-chip px-1.5 py-0.5 text-xs font-semibold', medalRankClass(position))}>
                  {position}着
                </span>
                <span>{sortedEntries[position - 1]?.horseName}</span>
              </div>
            ))}
          </div>
        </>
      }
      confirmLabel="確定する"
      confirmVariant="primary"
      onConfirm={onFinalize}
    />
  );
}

interface FinalizeActionGroupProps {
  race: RaceResultFormRace;
  entries: Entry[];
  sortedEntries: Entry[];
  canFinalizePayout?: boolean | undefined;
  isPending: boolean;
  isPayoutMoving: boolean;
  isChanged: boolean;
  netkeibaResult: NetkeibaRaceResult | null;
  showNetkeibaConfirm: boolean;
  onNetkeibaConfirmOpenChange: (open: boolean) => void;
  onManualClose: () => void;
  onReopen: () => void;
  onFetchNetkeibaResult: () => void;
  onNetkeibaFinalize: () => Promise<void>;
  onSubmit: () => Promise<void>;
  onPayoutFinalize: () => Promise<void>;
  onServerReset: () => Promise<void>;
}

/**
 * レース状態ごとの操作ボタン群。出走前は締切、締切後は着順確定、着順確定後は払戻確定を出す。
 * 着順の確定手段は固定オッズかどうかで Netkeiba 取得と手動並べ替えに分かれる。
 */
function FinalizeActionGroup({
  race,
  entries,
  sortedEntries,
  canFinalizePayout,
  isPending,
  isPayoutMoving,
  isChanged,
  netkeibaResult,
  showNetkeibaConfirm,
  onNetkeibaConfirmOpenChange,
  onManualClose,
  onReopen,
  onFetchNetkeibaResult,
  onNetkeibaFinalize,
  onSubmit,
  onPayoutFinalize,
  onServerReset,
}: FinalizeActionGroupProps) {
  return (
    <div className="mt-8 space-y-3">
      {race.status === 'SCHEDULED' && (
        <Button
          variant="outline"
          className="w-full py-6 text-sm font-semibold"
          onClick={onManualClose}
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
            onClick={onReopen}
            disabled={isPending || canFinalizePayout}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            受付を再開する
          </Button>

          {race.fixedOddsMode ? (
            <NetkeibaFinalizeActions
              entries={entries}
              canFinalizePayout={canFinalizePayout}
              isPending={isPending}
              isPayoutMoving={isPayoutMoving}
              netkeibaResult={netkeibaResult}
              showNetkeibaConfirm={showNetkeibaConfirm}
              onNetkeibaConfirmOpenChange={onNetkeibaConfirmOpenChange}
              onFetchResult={onFetchNetkeibaResult}
              onFinalize={onNetkeibaFinalize}
            />
          ) : (
            <ManualFinalizeActions
              sortedEntries={sortedEntries}
              canFinalizePayout={canFinalizePayout}
              isPending={isPending}
              isPayoutMoving={isPayoutMoving}
              isChanged={isChanged}
              onFinalize={onSubmit}
            />
          )}
        </div>
      )}

      {canFinalizePayout && (
        <div className="space-y-3">
          <ConfirmDialog
            trigger={
              <Button className="relative w-full py-6 text-lg font-semibold" disabled={isPayoutMoving || isPending}>
                {isPayoutMoving ? '払戻処理中...' : '払戻を確定する'}
              </Button>
            }
            title="払戻を確定しますか？"
            description="的中を集計し、各ユーザーへ払い戻します。この操作は取り消せません。"
            confirmLabel="払戻を確定する"
            confirmVariant="primary"
            onConfirm={onPayoutFinalize}
          />
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
            description="確定済みの着順・払戻がリセットされます。この操作は元に戻せません。"
            confirmLabel="リセットする"
            onConfirm={onServerReset}
          />
        </div>
      )}
    </div>
  );
}

export function RaceResultForm({
  raceId,
  entries: initialEntries,
  race,
  canFinalizePayout,
  showBet5CloseReminder,
  sideChildren,
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
  const [isPayoutMoving, setIsPayoutMoving] = useState(false);
  const [netkeibaResult, setNetkeibaResult] = useState<NetkeibaRaceResult | null>(null);
  const [showNetkeibaConfirm, setShowNetkeibaConfirm] = useState(false);

  const isChanged = JSON.stringify(sortedEntries.map((e) => e.id)) !== JSON.stringify(initialEntries.map((e) => e.id));

  const handleReset = () => {
    setSortedEntries(initialEntries);
    toast.message('初期状態にリセットしました');
  };

  const handleManualClose = () => {
    startTransition(async () => {
      const result = await closeRace(raceId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('受付を終了しました');
      router.refresh();
    });
  };

  const handleReopen = () => {
    startTransition(async () => {
      const result = await reopenRace(raceId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('受付を再開しました');
      router.refresh();
    });
  };

  const handlePayoutFinalize = async () => {
    setIsPayoutMoving(true);
    const result = await finalizePayout(raceId);
    setIsPayoutMoving(false);
    if (!result.success) {
      toast.error(result.error);
      // throw でダイアログを開いたままにし、再実行の判断を管理者に委ねる
      throw new Error(result.error);
    }
    toast.success('払戻確定通知を送信しました', {
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    });
    router.refresh();
  };

  const handleServerReset = async () => {
    const result = await resetRaceResults(raceId);
    if (!result.success) {
      toast.error(result.error);
      // throw でダイアログを開いたままにし、再実行の判断を管理者に委ねる
      throw new Error(result.error);
    }
    toast.success('着順設定を初期状態にリセットしました');
    router.refresh();
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
      toast.success('着順を確定し、払戻計算が完了しました', {
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
      toast.success('着順を確定し、Netkeibaオッズで払戻計算が完了しました', {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
      router.refresh();
    } catch (error) {
      toast.error('エラーが発生しました');
      console.error(error);
      throw error;
    }
  };

  const entryCount = initialEntries.length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <ResultOrderingPanel
        raceId={raceId}
        race={race}
        entries={initialEntries}
        sortedEntries={sortedEntries}
        setSortedEntries={setSortedEntries}
        isChanged={isChanged}
        onReset={handleReset}
      />

      <div className="space-y-6">
        {showBet5CloseReminder && (
          <div className="rounded-surface flex items-center justify-between gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
            <div className="flex items-center font-semibold text-amber-800">
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

        <Card className="p-6">
          <div className="mb-4">
            <AdminSectionTitle icon={Settings2}>レース情報</AdminSectionTitle>
          </div>

          <div className="divide-y divide-gray-100 text-sm">
            <div className="flex items-center justify-between py-2">
              <span className="text-text-sub">レース作成方法</span>
              <span className="text-text-main font-semibold">{race.netkeibaUrl ? 'Netkeibaから' : '手動'}</span>
            </div>
            {race.fixedOddsMode && (
              <div className="flex items-center justify-between py-2">
                <span className="text-text-sub">オッズ設定</span>
                <span className="text-turf-700 font-semibold">固定オッズ</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2">
              <span className="text-text-sub">ステータス</span>
              <Badge variant="status" label={race.status} />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text-sub">出走馬数</span>
              <span className="text-text-main font-semibold">{entryCount}頭</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text-sub">受付終了予定</span>
              <span className="text-text-main font-semibold">
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
              <span className="text-text-sub">コース</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="surface" label={race.surface} />
                <span className="font-semibold text-gray-700">{race.distance}m</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text-sub">馬場状態</span>
              <Badge variant="condition" label={race.condition} />
            </div>
          </div>

          <FinalizeActionGroup
            race={race}
            entries={initialEntries}
            sortedEntries={sortedEntries}
            canFinalizePayout={canFinalizePayout}
            isPending={isPending}
            isPayoutMoving={isPayoutMoving}
            isChanged={isChanged}
            netkeibaResult={netkeibaResult}
            showNetkeibaConfirm={showNetkeibaConfirm}
            onNetkeibaConfirmOpenChange={setShowNetkeibaConfirm}
            onManualClose={handleManualClose}
            onReopen={handleReopen}
            onFetchNetkeibaResult={handleFetchNetkeibaResult}
            onNetkeibaFinalize={handleNetkeibaFinalize}
            onSubmit={handleSubmit}
            onPayoutFinalize={handlePayoutFinalize}
            onServerReset={handleServerReset}
          />
        </Card>
        {sideChildren}
      </div>
    </div>
  );
}
