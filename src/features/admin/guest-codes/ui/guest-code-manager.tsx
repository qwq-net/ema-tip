'use client';

import { toast } from '@/shared/lib/toast';
import { Badge, Button, ConfirmDialog, Input, TableBody, TableHead, TableRow, TableShell, Td, Th } from '@/shared/ui';
import { FormattedDate } from '@/shared/ui/formatted-date';
import { Ban, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { generateGuestCode, invalidateGuestCode, invalidateUsersByCode } from '../actions/guest-actions';

type GuestCode = {
  code: string;
  title: string;
  createdBy: string;
  disabledAt: Date | null;
  createdAt: Date;
  creator?: {
    name: string | null;
  };
};

export function GuestCodeManager({ codes }: { codes: GuestCode[] }) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState('');

  const handleGenerate = async () => {
    if (!title) return;
    setIsGenerating(true);
    try {
      await generateGuestCode(title);
      setTitle('');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('コード生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInvalidateCode = async (code: string) => {
    try {
      await invalidateGuestCode(code);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('コードの無効化に失敗しました');
      throw error;
    }
  };

  const handleInvalidateUsers = async (code: string) => {
    try {
      await invalidateUsersByCode(code);
      toast.success('このコードに関連する全てのユーザーを凍結しました。');
    } catch (error) {
      console.error(error);
      toast.error('ユーザーの凍結に失敗しました');
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-control border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">新規ゲストコード発行</h3>
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="イベント名や用途など識別可能な言葉を入力してください"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="max-w-lg"
          />
          <Button onClick={handleGenerate} disabled={isGenerating || !title} className="disabled:opacity-50">
            {isGenerating ? '発行中...' : 'コード発行'}
          </Button>
        </div>
      </div>

      <TableShell>
        <TableHead>
          <Th>コード</Th>
          <Th>タイトル</Th>
          <Th>作成者</Th>
          <Th>作成日</Th>
          <Th>ステータス</Th>
          <Th className="text-right">操作</Th>
        </TableHead>
        <TableBody>
          {codes.map((code) => (
            <TableRow key={code.code}>
              <Td className="font-mono font-semibold text-gray-900">{code.code}</Td>
              <Td className="max-w-[200px] truncate text-gray-900" title={code.title}>
                {code.title}
              </Td>
              <Td className="text-gray-500">{code.creator?.name || '不明'}</Td>
              <Td className="text-gray-500">
                <FormattedDate date={code.createdAt} />
              </Td>
              <Td>
                {code.disabledAt ? <Badge variant="status" label="無効" /> : <Badge variant="status" label="有効" />}
              </Td>
              <Td className="text-right font-medium">
                <div className="flex justify-end space-x-2">
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:bg-red-50 hover:text-red-900"
                        title="このコードの全ユーザーを凍結"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    }
                    title="ユーザーの一括凍結"
                    description="危険: このコードで登録した全てのユーザーを凍結します。本当によろしいですか？"
                    confirmLabel="凍結する"
                    onConfirm={() => handleInvalidateUsers(code.code)}
                  />
                  {!code.disabledAt && (
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-orange-600 hover:bg-orange-50 hover:text-orange-900"
                          title="コード無効化"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="ゲストコードの無効化"
                      description="このコードを無効化してもよろしいですか？新規登録ができなくなります。"
                      confirmLabel="無効化する"
                      onConfirm={() => handleInvalidateCode(code.code)}
                    />
                  )}
                </div>
              </Td>
            </TableRow>
          ))}
        </TableBody>
      </TableShell>
    </div>
  );
}
