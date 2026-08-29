'use client';

import { Button } from '@/shared/ui';
import { calculateBracketNumber, getBracketColor } from '@/shared/utils/bracket';
import { getGenderAge, getGenderBadgeClass } from '@/shared/utils/gender';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { saveEntries } from '../actions';

type Horse = {
  id: string;
  name: string;
  gender: string;
  age: number | null;
};

type Entry = {
  id: string;
  horseId: string;
  horseName: string;
  horseGender: string;
  horseAge: number | null;
  bracketNumber: number | null;
  horseNumber: number | null;
};

type Props = {
  raceId: string;
  availableHorses: Horse[];
  existingEntries: Entry[];
};

function SortableEntry({
  horse,
  index,
  totalHorses,
  onRemove,
}: {
  horse: Horse;
  index: number;
  totalHorses: number;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
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
      {...attributes}
      {...listeners}
      className={`flex cursor-grab items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing ${isDragging ? 'ring-primary/50 z-10 ring-2' : ''}`}
    >
      <div className="text-gray-400">
        <GripVertical className="h-4 w-4" />
      </div>
      <span
        className={`flex h-6 w-6 items-center justify-center rounded text-sm font-semibold ${getBracketColor(bracketNumber)}`}
      >
        {bracketNumber || '?'}
      </span>
      <span className="text-primary bg-primary/10 flex h-6 w-6 items-center justify-center rounded text-sm font-semibold">
        {horseNumber}
      </span>
      <span className="flex-1 font-medium text-gray-900">{horse.name}</span>
      <span className={`rounded-full px-2 py-0.5 text-sm font-medium ${getGenderBadgeClass(horse.gender)}`}>
        {getGenderAge(horse.gender, horse.age)}
      </span>
      <button
        type="button"
        onClick={() => onRemove(horse.id)}
        className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function DraggableHorse({ horse, onClick }: { horse: Horse; onClick: () => void }) {
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
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="flex cursor-grab items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-gray-300 hover:bg-gray-50 active:cursor-grabbing"
    >
      <span className="flex-1 text-sm font-medium text-gray-900">{horse.name}</span>
      <span className={`rounded-full px-2 py-0.5 text-sm font-medium ${getGenderBadgeClass(horse.gender)}`}>
        {getGenderAge(horse.gender, horse.age)}
      </span>
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
    }))
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (activeIdStr.startsWith('available-')) {
      const horseId = activeIdStr.replace('available-', '');

      if (overIdStr === 'entries-list' || entries.some((e) => e.id === overIdStr)) {
        const horse = available.find((h) => h.id === horseId);
        if (horse) {
          addToEntries(horse);
        }
      }
      return;
    }

    if (entries.some((e) => e.id === activeIdStr)) {
      if (overIdStr === 'available-list' || available.some((h) => `available-${h.id}` === overIdStr)) {
        removeFromEntries(activeIdStr);
        return;
      }

      const oldIndex = entries.findIndex((e) => e.id === activeIdStr);
      const newIndex = entries.findIndex((e) => e.id === overIdStr);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setEntries((prev) => arrayMove(prev, oldIndex, newIndex));
      }
    }
  };

  const addToEntries = (horse: Horse) => {
    setAvailable((prev) => prev.filter((h) => h.id !== horse.id));
    setEntries((prev) => [...prev, horse]);
  };

  const removeFromEntries = (horseId: string) => {
    const horse = entries.find((e) => e.id === horseId);
    if (horse) {
      setEntries((prev) => prev.filter((e) => e.id !== horseId));
      setAvailable((prev) => [...prev, horse].sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  const removeAllEntries = () => {
    setAvailable((prev) => [...prev, ...entries].sort((a, b) => a.name.localeCompare(b.name)));
    setEntries([]);
  };

  const handleSave = () => {
    startTransition(async () => {
      const promise = saveEntries(
        raceId,
        entries.map((e) => e.id)
      );

      toast.promise(promise, {
        loading: '保存中...',
        success: '出走馬を保存しました',
        error: '保存に失敗しました',
      });

      await promise;
    });
  };

  const { setNodeRef: setAvailableRef } = useDroppable({ id: 'available-list' });
  const { setNodeRef: setEntriesRef } = useDroppable({ id: 'entries-list' });

  const activeHorse = activeId
    ? available.find((h) => `available-${h.id}` === activeId) || entries.find((h) => h.id === activeId)
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
        <div className="flex flex-col">
          <h3 className="mb-3 font-semibold text-gray-900">登録馬一覧</h3>
          <div
            ref={setAvailableRef}
            id="available-list"
            className="h-[calc(100vh-320px)] min-h-[500px] space-y-2 overflow-y-auto rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4"
          >
            {available.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">すべての馬が出走登録済みです</div>
            ) : (
              <SortableContext items={available.map((h) => `available-${h.id}`)} strategy={verticalListSortingStrategy}>
                {available.map((horse) => (
                  <DraggableHorse key={horse.id} horse={horse} onClick={() => addToEntries(horse)} />
                ))}
              </SortableContext>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">出走馬一覧 ({entries.length}頭)</h3>
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
          <div
            ref={setEntriesRef}
            id="entries-list"
            className="h-[calc(100vh-320px)] min-h-[500px] space-y-2 overflow-y-auto rounded-lg border border-gray-300 bg-white p-4"
          >
            {entries.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">左から馬をドラッグまたはクリックして追加</div>
            ) : (
              <SortableContext items={entries.map((h) => h.id)} strategy={verticalListSortingStrategy}>
                {entries.map((horse, index) => (
                  <SortableEntry
                    key={horse.id}
                    horse={horse}
                    index={index}
                    totalHorses={entries.length}
                    onRemove={removeFromEntries}
                  />
                ))}
              </SortableContext>
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeHorse && (
          <div className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white p-3 shadow-lg">
            <span className="font-medium text-gray-900">{activeHorse.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-sm font-medium ${getGenderBadgeClass(activeHorse.gender)}`}>
              {getGenderAge(activeHorse.gender, activeHorse.age)}
            </span>
          </div>
        )}
      </DragOverlay>

      <div className="mt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="from-primary to-primary/80 hover:to-primary w-full rounded-md bg-linear-to-r px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? '保存中...' : `登録する (${entries.length}頭)`}
        </button>
      </div>
    </DndContext>
  );
}
