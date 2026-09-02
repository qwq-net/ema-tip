'use client';

import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useState, useTransition, type ReactNode } from 'react';
import { Button } from './button';

interface ConfirmDialogProps {
  /** ダイアログを開くトリガー要素。asChild で渡すためボタン系の単一要素であること。open / onOpenChange で外部制御する場合は省略する。 */
  trigger?: ReactNode;
  /** 外部制御用の開閉状態。onOpenChange とセットで渡す。省略時は内部 state で開閉する。 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** タイトル上部に表示するアイコン領域。色付きの円形ラッパーごと呼び出し側で指定する。 */
  icon?: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  /** 確認ボタンの見た目。削除等の破壊的操作は destructive、購入・確定等の前向きな操作は primary を使う。 */
  confirmVariant?: 'primary' | 'destructive';
  /** 確認時に実行する処理。resolve でダイアログを閉じ、throw なら開いたまま維持する。 */
  onConfirm: () => Promise<void> | void;
}

/**
 * 要確認操作の確認ダイアログ。onConfirm の実行中は各ボタンを無効化する。
 * エラー通知は呼び出し側の責務。閉じたままにしたい失敗は onConfirm から throw して伝える。
 */
export function ConfirmDialog({
  trigger,
  open,
  onOpenChange,
  icon,
  title,
  description,
  confirmLabel = '実行する',
  confirmVariant = 'destructive',
  onConfirm,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

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
    <AlertDialog.Root open={isOpen} onOpenChange={setOpen}>
      {trigger && <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>}
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="animate-in fade-in fixed inset-0 z-50 bg-black/60 backdrop-blur-sm duration-200" />
        <AlertDialog.Content className="animate-in zoom-in-95 rounded-surface fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-white p-6 shadow-2xl duration-200">
          <div className="flex flex-col items-center text-center">
            {icon}
            <AlertDialog.Title className="mb-2 text-xl font-semibold text-gray-900">{title}</AlertDialog.Title>
            <AlertDialog.Description asChild className="w-full text-sm text-gray-500">
              <div>{description}</div>
            </AlertDialog.Description>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant={confirmVariant}
              onClick={handleConfirm}
              disabled={isPending}
              className="w-full font-semibold"
            >
              {isPending ? '実行中...' : confirmLabel}
            </Button>
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={isPending} className="w-full font-semibold">
                キャンセル
              </Button>
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
