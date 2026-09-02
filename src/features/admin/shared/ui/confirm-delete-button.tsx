'use client';

import { toast } from '@/shared/lib/toast';
import { Button, ConfirmDialog } from '@/shared/ui';
import { Trash2 } from 'lucide-react';

interface ConfirmDeleteButtonProps {
  /** ダイアログの見出し。例: 「馬の削除」 */
  title: string;
  /** 確認文とトーストに表示する対象名。 */
  itemName: string;
  /** 削除を実行する処理。サーバーアクションを bind して渡す想定。失敗時は throw すること。 */
  onDelete: () => Promise<void>;
}

/**
 * 一覧行に置くゴミ箱アイコンの削除ボタン。確認ダイアログを挟んで onDelete を実行し、
 * 成否をトーストで通知する。失敗時はダイアログを開いたまま維持する。
 */
export function ConfirmDeleteButton({ title, itemName, onDelete }: ConfirmDeleteButtonProps) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" className="text-text-sub hover:text-red-600" title="削除">
          <Trash2 size={18} />
        </Button>
      }
      title={title}
      description={`本当に「${itemName}」を削除してもよろしいですか？この操作は取り消せません。`}
      confirmLabel="削除する"
      onConfirm={async () => {
        try {
          await onDelete();
          toast.success(`「${itemName}」を削除しました`);
        } catch (error) {
          console.error(error);
          const message = error instanceof Error && error.message ? error.message : '削除に失敗しました';
          toast.error(message);
          throw error;
        }
      }}
    />
  );
}
