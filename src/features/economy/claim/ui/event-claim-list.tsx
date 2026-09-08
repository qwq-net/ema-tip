'use client';

import { type EventStatus } from '@/shared/constants/status';
import { toast } from '@/shared/lib/toast';
import { Badge, Button, Card, CardContent, CardHeader, EmptyState } from '@/shared/ui';
import { useTransition } from 'react';
import { claimEvent } from '../actions';

interface AvailableEvent {
  id: string;
  name: string;
  description: string | null;
  distributeAmount: number;
  date: string;
  status: EventStatus;
  isJoined?: boolean;
}

interface JoinButtonAppearance {
  variant: 'outline' | 'primary' | 'secondary';
  label: string;
}

/** 参加ボタンの見た目とラベルを返す。参加済みが最優先で、次に受付中、それ以外は開始前として扱う。 */
function joinButtonAppearance(isJoined: boolean, status: EventStatus): JoinButtonAppearance {
  if (isJoined) return { variant: 'outline', label: '参加済み' };
  if (status === 'ACTIVE') return { variant: 'primary', label: '参加する' };
  return { variant: 'secondary', label: '開始前' };
}

export function EventClaimList({ events }: { events: AvailableEvent[] }) {
  const [isPending, startTransition] = useTransition();

  const handleClaim = (eventId: string) => {
    startTransition(async () => {
      try {
        const result = await claimEvent(eventId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success('イベントに参加しました');
      } catch {
        toast.error('参加処理に失敗しました');
      }
    });
  };

  if (events.length === 0) {
    return (
      <EmptyState
        title="参加できるイベントはありません"
        description="新しいイベントが公開されると、ここに表示されます。"
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => {
        const joinButton = joinButtonAppearance(event.isJoined ?? false, event.status);
        return (
          <Card key={event.id} className="flex flex-col transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold">{event.name}</h2>
                <Badge
                  label={event.isJoined ? '参加済み' : event.status}
                  variant={event.isJoined ? 'role' : 'status'}
                  className={event.isJoined ? 'bg-blue-100 text-blue-700' : undefined}
                />
              </div>
              <p className="mt-1 text-sm text-gray-600">開催日: {event.date}</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <p className="text-text-sub mb-4 line-clamp-2 flex-1 text-sm">
                {event.description || '説明はありません'}
              </p>
              <div className="mt-auto flex items-center justify-between pt-4">
                <span className="text-primary font-semibold">
                  配布: {event.distributeAmount.toLocaleString('ja-JP')} 円
                </span>
                <Button
                  onClick={() => handleClaim(event.id)}
                  disabled={isPending || event.status !== 'ACTIVE' || event.isJoined}
                  size="sm"
                  variant={joinButton.variant}
                >
                  {joinButton.label}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
