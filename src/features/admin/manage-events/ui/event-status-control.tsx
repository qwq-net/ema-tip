'use client';

import type { EventStatus } from '@/shared/constants/status';
import { Badge, Button, ConfirmDialog } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import { Pause, Play, RefreshCw, Square } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { updateEventStatus } from '../actions';

// サーバーコンポーネントからも指定できるよう、アイコンは関数ではなくキーで受ける
const ICONS = { play: Play, pause: Pause, stop: Square, resume: RefreshCw } as const;

interface EventStatusActionProps {
  eventId: string;
  /** 遷移先の状態。 */
  next: EventStatus;
  label: string;
  icon: keyof typeof ICONS;
  variant: 'primary' | 'outline';
  /** 完了トーストの文言。 */
  done: string;
  /** 指定すると押下時に確認ダイアログを挟む。参加者に影響が大きく、取り消しに手間がかかる遷移に使う。 */
  confirm?: { title: string; description: string; confirmLabel: string };
}

/** イベントの状態を 1 段階進めるボタン。開始・一時停止・終了・再開の全てがこの 1 部品で、ヘッダーのパネルと案内バナーで共有する。 */
export function EventStatusAction({ eventId, next, label, icon, variant, done, confirm }: EventStatusActionProps) {
  const [isPending, startTransition] = useTransition();
  const Icon = ICONS[icon];

  const run = () => {
    startTransition(async () => {
      try {
        await updateEventStatus(eventId, next);
        toast.success(done);
      } catch (error) {
        console.error(error);
        toast.error('イベントの状態を変更できませんでした');
      }
    });
  };

  const button = (
    <Button variant={variant} disabled={isPending} onClick={confirm ? undefined : run} className="font-semibold">
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );

  if (!confirm) return button;
  return (
    <ConfirmDialog
      trigger={button}
      title={confirm.title}
      description={confirm.description}
      confirmLabel={confirm.confirmLabel}
      confirmVariant="primary"
      onConfirm={run}
    />
  );
}

export const FINISH_CONFIRM = {
  title: 'イベントを終了しますか？',
  description: '参加登録と馬券購入を締め、ランキングを確定させます。終了後も再開できます。',
  confirmLabel: '終了する',
} as const;

// 状態ごとの見え方。バッジと同じ分類色を薄く敷き、いまの状態と参加者に起きていることを 1 行で示す
const PANEL_STYLES = {
  SCHEDULED: {
    className: 'border-cat-green-bg bg-cat-green-bg/40',
    description: '参加者にはまだ公開されていません',
  },
  ACTIVE: {
    className: 'border-cat-blue-bg bg-cat-blue-bg/40',
    description: '参加登録と馬券購入を受け付けています',
  },
  COMPLETED: {
    className: 'border-gray-200 bg-gray-50',
    description: '参加と購入は締め切られています',
  },
} satisfies Record<EventStatus, { className: string; description: string }>;

/**
 * イベント詳細ヘッダーの状態パネル。いまの状態・参加者に起きていること・次に進める操作を 1 つの枡に収める。
 * 準備中は開始、開催中は一時停止と終了、終了後は再開を出す。
 */
export function EventStatusPanel({
  eventId,
  status,
  className,
}: {
  eventId: string;
  status: EventStatus;
  className?: string;
}) {
  const style = PANEL_STYLES[status];
  return (
    <section
      aria-label="イベントの状態"
      className={cn('rounded-control flex flex-col gap-3 border p-4', style.className, className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="status" label={status} />
        <span className="text-sm text-gray-600">{style.description}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {status === 'SCHEDULED' && (
          <EventStatusAction
            eventId={eventId}
            next="ACTIVE"
            label="イベントを開始する"
            icon="play"
            variant="primary"
            done="イベントを開始しました"
          />
        )}
        {status === 'ACTIVE' && (
          <>
            <EventStatusAction
              eventId={eventId}
              next="SCHEDULED"
              label="一時停止"
              icon="pause"
              variant="outline"
              done="イベントを一時停止しました"
            />
            <EventStatusAction
              eventId={eventId}
              next="COMPLETED"
              label="終了する"
              icon="stop"
              variant="outline"
              done="イベントを終了しました"
              confirm={FINISH_CONFIRM}
            />
          </>
        )}
        {status === 'COMPLETED' && (
          <EventStatusAction
            eventId={eventId}
            next="ACTIVE"
            label="イベントを再開する"
            icon="resume"
            variant="outline"
            done="イベントを再開しました"
          />
        )}
      </div>
    </section>
  );
}
