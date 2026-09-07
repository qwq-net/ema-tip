'use client';

import { toast } from '@/shared/lib/toast';
import { Button, ConfirmDialog } from '@/shared/ui';
import { Ban, Trash2, Undo } from 'lucide-react';
import { useTransition } from 'react';
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
      const result = await toggleUserStatus(userId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isDisabled ? 'ユーザーを有効化しました' : 'ユーザーを無効化しました');
    });
  };

  const handleDelete = async () => {
    const result = await deleteUser(userId);
    if (!result.success) {
      toast.error(result.error);
      // throw でダイアログを開いたままにし、再実行の判断を管理者に委ねる
      throw new Error(result.error);
    }
    toast.success('ユーザーを削除しました');
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
