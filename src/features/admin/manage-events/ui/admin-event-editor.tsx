'use client';

import { AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { EVENT_STATUS_LABELS, type EventStatus } from '@/shared/constants/status';
import { Button, Card, CardContent } from '@/shared/ui';
import { Pause, Play, RefreshCw, Square } from 'lucide-react';
import { useTransition } from 'react';
import { updateEventStatus } from '../actions';
import { EventForm } from './event-form';

type Event = {
  id: string;
  name: string;
  description: string | null;
  status: EventStatus;
  distributeAmount: number;
  date: string;
  loanAmount: number | null;
  loanEnabled: boolean;
  loanThresholdPercent: number;
  updatedAt: Date;
};

interface AdminEventEditorProps {
  event: Event;
  onSuccess?: () => void;
}

export function AdminEventEditor({ event, onSuccess }: AdminEventEditorProps) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: Event['status']) => {
    startTransition(async () => {
      await updateEventStatus(event.id, newStatus);
    });
  };

  return (
    <div className="space-y-6">
      {/* React 19 は form action 完了後にフィールドを初期値へ自動リセットするため、
          保存で updatedAt が変わるたびに再マウントし、リセット先を最新のサーバー値へ同期させる */}
      <EventForm key={event.updatedAt.toISOString()} initialData={event} onSuccess={onSuccess} />

      <div className="border-t border-gray-100 pt-6">
        <AdminSectionTitle className="mb-4">アクション</AdminSectionTitle>

        <div className="space-y-4">
          <Card className="bg-gray-50">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-900">ステータス変更</p>
                <p className="text-sm text-gray-500">
                  現在のステータス: {EVENT_STATUS_LABELS[event.status] || event.status}
                </p>
              </div>
              <div className="flex gap-2">
                {event.status === 'SCHEDULED' && (
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleStatusChange('ACTIVE')}
                    className="bg-green-600 font-semibold text-white hover:bg-green-700"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    開始
                  </Button>
                )}
                {event.status === 'ACTIVE' && (
                  <>
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleStatusChange('SCHEDULED')}
                      className="bg-amber-500 font-semibold text-white hover:bg-amber-600"
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      一時停止
                    </Button>
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleStatusChange('COMPLETED')}
                      variant="destructive"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      終了
                    </Button>
                  </>
                )}
                {event.status === 'COMPLETED' && (
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleStatusChange('ACTIVE')}
                    className="bg-gray-500 font-semibold text-white hover:bg-gray-600"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    再開
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-900">WIN5 (BET5) 設定</p>
                <p className="text-sm text-gray-500">5レース的中投票の設定を行います</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => (window.location.href = `/admin/events/${event.id}/bet5`)}
              >
                設定へ移動
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-50">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-900">ランキング管理</p>
                <p className="text-sm text-gray-500">順位確認と公開設定を行います</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => (window.location.href = `/admin/events/${event.id}/ranking`)}
              >
                ランキングへ移動
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
