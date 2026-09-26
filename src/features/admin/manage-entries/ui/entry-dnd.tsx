'use client';

import { HorseSourceBadge, HorseTypeBadge, type HorseSource, type HorseType } from '@/entities/horse';
import { moveBracketGroup, moveSelectedEntries } from '@/features/admin/manage-entries/lib/entry-order';
import {
  filterHorses,
  SOURCE_FILTER_OPTIONS,
  TYPE_FILTER_OPTIONS,
  type SourceFilter,
  type TypeFilter,
} from '@/features/admin/shared/lib/filter-horses';
import { SegmentedControl } from '@/features/admin/shared/ui/segmented-control';
import { toast } from '@/shared/lib/toast';
import { Button, Checkbox, Input, SectionTitle } from '@/shared/ui';
import { calculateBracketNumber, getBracketColor, MAX_HORSES_PER_RACE } from '@/shared/utils/bracket';
import { getGenderAge, getGenderBadgeClass } from '@/shared/utils/gender';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { saveEntries } from '../actions';

interface Horse {
  id: string;
  name: string;
  gender: string;
  age: number | null;
  source: HorseSource;
  type: HorseType;
}

interface Entry {
  id: string;
  horseId: string;
  horseName: string;
  horseGender: string;
  horseAge: number | null;
  horseSource: HorseSource;
  horseType: HorseType;
  bracketNumber: number | null;
  horseNumber: number | null;
}

interface Props {
  raceId: string;
  availableHorses: Horse[];
  existingEntries: Entry[];
}

function SortableEntry({
  horse,
  index,
  totalHorses,
  onRemove,
  selected,
  onSelect,
  showBracketControls,
  onMoveBracket,
}: {
  horse: Horse;
  index: number;
  totalHorses: number;
  onRemove: (id: string) => void;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  showBracketControls: boolean;
  onMoveBracket: (bracketNumber: number, direction: 'up' | 'down') => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: horse.id,
  });

  const horseNumber = index + 1;
  const bracketNumber = calculateBracketNumber(horseNumber, totalHorses);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-control flex items-center gap-2 border border-gray-200 bg-white p-3 ${isDragging ? 'ring-primary/50 z-10 ring-2' : ''}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`${horse.name} を並べ替える`}
        className="text-text-sub rounded-control inline-flex h-10 w-10 shrink-0 cursor-grab items-center justify-center hover:bg-gray-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Checkbox
        aria-label={`${horse.name} を選択`}
        className="h-6 w-6 shrink-0"
        checked={selected}
        onCheckedChange={(checked) => onSelect(horse.id, checked)}
      />
      <span
        className={`rounded-chip flex h-6 w-6 items-center justify-center text-sm font-semibold ${getBracketColor(bracketNumber)}`}
      >
        {bracketNumber || '?'}
      </span>
      <span className="text-primary bg-primary/10 rounded-chip flex h-6 w-6 items-center justify-center text-sm font-semibold">
        {horseNumber}
      </span>
      <span className="text-text-main min-w-0 flex-1 truncate font-semibold">{horse.name}</span>
      {showBracketControls && (
        <div className="flex shrink-0 gap-1" role="group" aria-label={`${bracketNumber}枠の移動`}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={bracketNumber === 1}
            onClick={() => onMoveBracket(bracketNumber, 'up')}
            aria-label={`${bracketNumber}枠を上へ`}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={bracketNumber === Math.min(totalHorses, 8)}
            onClick={() => onMoveBracket(bracketNumber, 'down')}
            aria-label={`${bracketNumber}枠を下へ`}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
      <span className="hidden xl:contents">
        <HorseSourceBadge source={horse.source} />
        <HorseTypeBadge type={horse.type} />
        <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${getGenderBadgeClass(horse.gender)}`}>
          {getGenderAge(horse.gender, horse.age)}
        </span>
      </span>
      <button
        type="button"
        onClick={() => onRemove(horse.id)}
        aria-label={`${horse.name} を出走から外す`}
        className="text-text-sub rounded-chip p-1 transition-colors hover:bg-red-50 hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function DraggableHorse({
  horse,
  onClick,
  selected,
  onSelect,
}: {
  horse: Horse;
  onClick: () => void;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `available-${horse.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-control flex items-center gap-3 border border-gray-200 bg-white p-3 transition hover:border-gray-300 hover:bg-gray-50"
    >
      <Checkbox
        aria-label={`${horse.name} を選択`}
        className="h-6 w-6 shrink-0"
        checked={selected}
        onCheckedChange={(checked) => onSelect(horse.id, checked)}
      />
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={onClick}
        className="flex min-w-0 flex-1 cursor-grab items-center gap-3 text-left active:cursor-grabbing"
      >
        <span className="text-text-main min-w-0 flex-1 truncate text-sm font-semibold">{horse.name}</span>
        <HorseSourceBadge source={horse.source} />
        <HorseTypeBadge type={horse.type} />
        <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${getGenderBadgeClass(horse.gender)}`}>
          {getGenderAge(horse.gender, horse.age)}
        </span>
      </button>
    </div>
  );
}

export function EntryDnd({ raceId, availableHorses: initialAvailable, existingEntries }: Props) {
  const [available, setAvailable] = useState<Horse[]>(initialAvailable);
  const [entries, setEntries] = useState<Horse[]>(
    existingEntries.map((e) => ({
      id: e.horseId,
      name: e.horseName,
      gender: e.horseGender,
      age: e.horseAge,
      source: e.horseSource,
      type: e.horseType,
    }))
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<Set<string>>(new Set());
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [searchWord, setSearchWord] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

  // 絞り込みは登録馬一覧の表示のみに効かせる。available 自体は保持し、DnD の出し入れに影響させない
  const visibleHorses = filterHorses(available, searchWord, sourceFilter, typeFilter);

  // キーボードでも並び替え可能にする。行にフォーカスして Space で持ち上げ、矢印キーで移動する
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  // 登録馬一覧からのドラッグを出走馬一覧へ反映する。出走側の枠や行以外へ落とされたら何もしない
  const dropIntoEntries = (activeIdStr: string, overIdStr: string) => {
    if (overIdStr !== 'entries-list' && !entries.some((e) => e.id === overIdStr)) return;

    const horse = available.find((h) => h.id === activeIdStr.replace('available-', ''));
    if (!horse) return;

    addToEntries(horse, overIdStr === 'entries-list' ? undefined : overIdStr);
  };

  // 出走馬一覧の中での並び替えを反映する。行を特定できない場合と同じ位置への移動は無視する
  const reorderEntries = (activeIdStr: string, overIdStr: string) => {
    const oldIndex = entries.findIndex((e) => e.id === activeIdStr);
    const newIndex = entries.findIndex((e) => e.id === overIdStr);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    setEntries((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (activeIdStr.startsWith('available-')) {
      dropIntoEntries(activeIdStr, overIdStr);
      return;
    }

    if (!entries.some((e) => e.id === activeIdStr)) return;

    if (overIdStr === 'available-list' || available.some((h) => `available-${h.id}` === overIdStr)) {
      removeFromEntries(activeIdStr);
      return;
    }

    reorderEntries(activeIdStr, overIdStr);
  };

  // insertBeforeId のエントリの直前に挿入する。省略時は末尾に追加
  const addToEntries = (horse: Horse, insertBeforeId?: string) => {
    if (entries.length >= MAX_HORSES_PER_RACE) {
      toast.error(`出走馬は${MAX_HORSES_PER_RACE}頭までです`);
      return;
    }

    setSelectedAvailableIds((previous) => {
      const next = new Set(previous);
      next.delete(horse.id);
      return next;
    });
    setAvailable((prev) => prev.filter((h) => h.id !== horse.id));
    setEntries((prev) => {
      const index = insertBeforeId ? prev.findIndex((e) => e.id === insertBeforeId) : -1;
      if (index === -1) return [...prev, horse];
      return [...prev.slice(0, index), horse, ...prev.slice(index)];
    });
  };

  const toggleAvailableSelection = (horseId: string, selected: boolean) => {
    setSelectedAvailableIds((previous) => {
      const next = new Set(previous);
      if (selected) next.add(horseId);
      else next.delete(horseId);
      return next;
    });
  };

  const toggleEntrySelection = (horseId: string, selected: boolean) => {
    setSelectedEntryIds((previous) => {
      const next = new Set(previous);
      if (selected) next.add(horseId);
      else next.delete(horseId);
      return next;
    });
  };

  const addSelectedEntries = () => {
    const selected = available.filter((horse) => selectedAvailableIds.has(horse.id));
    if (selected.length === 0) return;
    if (entries.length + selected.length > MAX_HORSES_PER_RACE) {
      toast.error(`出走馬は${MAX_HORSES_PER_RACE}頭までです`);
      return;
    }
    setEntries((previous) => [...previous, ...selected]);
    setAvailable((previous) => previous.filter((horse) => !selectedAvailableIds.has(horse.id)));
    setSelectedAvailableIds(new Set());
  };

  const removeSelectedEntries = () => {
    const removed = entries.filter((horse) => selectedEntryIds.has(horse.id));
    setEntries((previous) => previous.filter((horse) => !selectedEntryIds.has(horse.id)));
    setAvailable((previous) => [...previous, ...removed].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedEntryIds(new Set());
  };

  const removeFromEntries = (horseId: string) => {
    const horse = entries.find((e) => e.id === horseId);
    if (horse) {
      setSelectedEntryIds((previous) => {
        const next = new Set(previous);
        next.delete(horseId);
        return next;
      });
      setEntries((prev) => prev.filter((e) => e.id !== horseId));
      setAvailable((prev) => [...prev, horse].sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  const removeAllEntries = () => {
    setAvailable((prev) => [...prev, ...entries].sort((a, b) => a.name.localeCompare(b.name)));
    setEntries([]);
    setSelectedEntryIds(new Set());
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveEntries(
        raceId,
        entries.map((e) => e.id)
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('出走馬を保存しました');
    });
  };

  const { setNodeRef: setAvailableRef } = useDroppable({ id: 'available-list' });
  const { setNodeRef: setEntriesRef } = useDroppable({ id: 'entries-list' });

  const activeHorse = activeId
    ? (available.find((h) => `available-${h.id}` === activeId) ?? entries.find((h) => h.id === activeId))
    : null;

  return (
    <DndContext
      id={`entry-dnd-${raceId}`}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col">
          <div className="mb-3 flex min-h-8 items-center">
            <SectionTitle>登録馬一覧</SectionTitle>
          </div>
          <div className="rounded-control flex h-[calc(100vh-320px)] min-h-[500px] flex-col border border-dashed border-gray-300 bg-gray-50">
            <div className="flex flex-wrap items-center gap-2 border-b border-dashed border-gray-300 p-3">
              <SegmentedControl options={SOURCE_FILTER_OPTIONS} value={sourceFilter} onChange={setSourceFilter} />
              <SegmentedControl options={TYPE_FILTER_OPTIONS} value={typeFilter} onChange={setTypeFilter} />
              <Input
                type="search"
                aria-label="馬名で検索"
                value={searchWord}
                onChange={(e) => setSearchWord(e.target.value)}
                placeholder="馬名で検索"
                className="basis-full sm:flex-1 sm:basis-auto"
              />
            </div>
            <div className="flex flex-wrap gap-2 border-b border-dashed border-gray-300 p-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setSelectedAvailableIds(
                    (previous) => new Set([...previous, ...visibleHorses.map((horse) => horse.id)])
                  )
                }
                disabled={visibleHorses.length === 0}
              >
                表示中を選択
              </Button>
              <Button type="button" size="sm" onClick={addSelectedEntries} disabled={selectedAvailableIds.size === 0}>
                選択した馬を追加 ({selectedAvailableIds.size}頭)
              </Button>
              {selectedAvailableIds.size > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedAvailableIds(new Set())}>
                  選択解除
                </Button>
              )}
            </div>
            <div ref={setAvailableRef} id="available-list" className="flex-1 space-y-2 overflow-y-auto p-4">
              {visibleHorses.length === 0 ? (
                <div className="text-text-sub py-8 text-center text-sm">
                  {available.length === 0 ? 'すべての馬が出走登録済みです' : '該当する馬がいません'}
                </div>
              ) : (
                <SortableContext
                  items={visibleHorses.map((h) => `available-${h.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {visibleHorses.map((horse) => (
                    <DraggableHorse
                      key={horse.id}
                      horse={horse}
                      onClick={() => addToEntries(horse)}
                      selected={selectedAvailableIds.has(horse.id)}
                      onSelect={toggleAvailableSelection}
                    />
                  ))}
                </SortableContext>
              )}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="mb-3 flex min-h-8 items-center justify-between">
            <SectionTitle>出走馬一覧 ({entries.length}頭)</SectionTitle>
            {entries.length > 0 && (
              <Button
                type="button"
                variant="destructive-outline"
                size="sm"
                onClick={removeAllEntries}
                className="h-8 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                一括削除
              </Button>
            )}
          </div>
          {selectedEntryIds.size > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEntries((previous) => moveSelectedEntries(previous, selectedEntryIds, 'up'))}
              >
                選択馬を上へ
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEntries((previous) => moveSelectedEntries(previous, selectedEntryIds, 'down'))}
              >
                選択馬を下へ
              </Button>
              <Button type="button" size="sm" variant="destructive-outline" onClick={removeSelectedEntries}>
                選択馬を出走から外す
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedEntryIds(new Set())}>
                選択解除
              </Button>
            </div>
          )}
          <p className="text-text-sub mb-2 text-sm">枠を動かすと、枠番は新しい馬番から自動で振り直されます。</p>
          <div
            ref={setEntriesRef}
            id="entries-list"
            className="rounded-control h-[calc(100vh-320px)] min-h-[500px] space-y-2 overflow-y-auto border border-gray-300 bg-white p-4"
          >
            {entries.length === 0 ? (
              <div className="text-text-sub py-8 text-center text-sm">一覧から馬を押すかドラッグして追加</div>
            ) : (
              <SortableContext items={entries.map((h) => h.id)} strategy={verticalListSortingStrategy}>
                {entries.map((horse, index) => (
                  <SortableEntry
                    key={horse.id}
                    horse={horse}
                    index={index}
                    totalHorses={entries.length}
                    onRemove={removeFromEntries}
                    selected={selectedEntryIds.has(horse.id)}
                    onSelect={toggleEntrySelection}
                    showBracketControls={
                      index === 0 ||
                      calculateBracketNumber(index, entries.length) !==
                        calculateBracketNumber(index + 1, entries.length)
                    }
                    onMoveBracket={(bracket, direction) =>
                      setEntries((previous) => moveBracketGroup(previous, bracket, direction))
                    }
                  />
                ))}
              </SortableContext>
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeHorse && (
          <div className="rounded-control flex items-center gap-3 border border-gray-300 bg-white p-3 shadow-lg">
            <span className="text-text-main font-semibold">{activeHorse.name}</span>
            <HorseSourceBadge source={activeHorse.source} />
            <HorseTypeBadge type={activeHorse.type} />
            <span
              className={`rounded-full px-2 py-0.5 text-sm font-semibold ${getGenderBadgeClass(activeHorse.gender)}`}
            >
              {getGenderAge(activeHorse.gender, activeHorse.age)}
            </span>
          </div>
        )}
      </DragOverlay>

      <div className="mt-6">
        <Button type="button" onClick={handleSave} disabled={isPending} className="w-full">
          {isPending ? '保存中...' : `登録する (${entries.length}頭)`}
        </Button>
      </div>
    </DndContext>
  );
}
