'use client';

import { Button, ConfirmDialog } from '@/shared/ui';
import { Ban, Trash2, Undo } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { deleteUser, toggleUserStatus } from '../actions';

interface UserActionsMenuProps {
  userId: string;
  isDisabled: boolean;
  isCurrentUser: boolean;
}

export function UserActionsMenu({ userId, isDisabled, isCurrentUser }: UserActionsMenuProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggleStatus = () => {
    startTransition(async () => {
      try {
        await toggleUserStatus(userId);
        toast.success(isDisabled ? 'ユーザーを有効化しました' : 'ユーザーを無効化しました');
      } catch (error) {
        toast.error('ステータスの変更に失敗しました');
        console.error(error);
      }
    });
  };

  const handleDelete = async () => {
    try {
      await deleteUser(userId);
      toast.success('ユーザーを削除しました');
    } catch (error) {
      toast.error('ユーザーの削除に失敗しました');
      console.error(error);
      // throw でダイアログを開いたままにし、再実行の判断を管理者に委ねる
      throw error;
    }
  };

  if (isCurrentUser) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isDisabled ? 'destructive-outline' : 'destructive'}
        size="sm"
        onClick={handleToggleStatus}
        disabled={isPending}
        title={isDisabled ? '有効化' : '無効化'}
      >
        {isDisabled ? <Undo className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
      </Button>
      <ConfirmDialog
        trigger={
          <Button variant="destructive" size="sm" disabled={isPending} title="削除">
            <Trash2 className="h-4 w-4" />
          </Button>
        }
        title="このユーザーを削除しますか？"
        description="この操作は取り消せません。"
        confirmLabel="削除する"
        onConfirm={handleDelete}
      />
    </div>
  );
}
