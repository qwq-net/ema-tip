'use client';

import { toast } from '@/shared/lib/toast';
import { Button, ConfirmDialog } from '@/shared/ui';
import type { ActionResult } from '@/shared/utils/action-result';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ConfirmDeleteButtonProps {
  /** ダイアログの見出し。例: 「馬の削除」 */
  title: string;
  /** 確認文とトーストに表示する対象名。 */
  itemName: string;
  /** 削除を実行する処理。サーバーアクションを bind して渡す想定。失敗は ActionResult の error で返すこと。 */
  onDelete: () => Promise<ActionResult<void>>;
  /** 成功後に移動する一覧ページ。詳細ページ自身を削除するときに渡す。 */
  redirectTo?: string;
  /** 削除に伴うデータ消去など、対象固有の注意点。 */
  description?: string;
}

/**
 * 一覧行に置くゴミ箱アイコンの削除ボタン。確認ダイアログを挟んで onDelete を実行し、
 * 成否をトーストで通知する。失敗時はダイアログを開いたまま維持する。
 */
export function ConfirmDeleteButton({ title, itemName, onDelete, redirectTo, description }: ConfirmDeleteButtonProps) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="text-text-sub hover:text-error"
          aria-label={`${itemName} を削除`}
        >
          <Trash2 size={18} />
        </Button>
      }
      title={title}
      description={description ?? `本当に「${itemName}」を削除してもよろしいですか？この操作は取り消せません。`}
      confirmLabel="削除する"
      onConfirm={async () => {
        const result = await onDelete();
        if (!result.success) {
          toast.error(result.error);
          // throw でダイアログを開いたままにし、再実行の判断を管理者に委ねる
          throw new Error(result.error);
        }
        toast.success(`「${itemName}」を削除しました`);
        if (redirectTo) router.push(redirectTo);
      }}
    />
  );
}
