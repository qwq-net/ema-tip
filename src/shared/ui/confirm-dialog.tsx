'use client';

import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useState, useTransition, type ReactNode } from 'react';
import { Button } from './button';

interface ConfirmDialogProps {
  /** ダイアログを開くトリガー要素。asChild で渡すためボタン系の単一要素であること。 */
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  /** 確認時に実行する処理。resolve でダイアログを閉じ、throw なら開いたまま維持する。 */
  onConfirm: () => Promise<unknown> | void;
}

/**
 * 破壊的操作の確認ダイアログ。onConfirm の実行中は確認ボタンを無効化する。
 * エラー通知は呼び出し側の責務。閉じたままにしたい失敗は onConfirm から throw して伝える。
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = '実行する',
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await onConfirm();
        setOpen(false);
      } catch {
        // 呼び出し側で通知済みの想定。開いたままにする。
      }
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="animate-in fade-in fixed inset-0 z-50 bg-black/50 duration-200" />
        <AlertDialog.Content className="animate-in zoom-in-95 fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl duration-200">
          <AlertDialog.Title className="text-xl font-semibold text-gray-900">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-gray-600">{description}</AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={isPending}>
                キャンセル
              </Button>
            </AlertDialog.Cancel>
            <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
              {isPending ? '実行中...' : confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
