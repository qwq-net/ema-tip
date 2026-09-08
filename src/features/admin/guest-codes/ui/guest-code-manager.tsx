'use client';

import { AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { toast } from '@/shared/lib/toast';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Label,
  TableBody,
  TableEmptyRow,
  TableHead,
  TableRow,
  TableShell,
  Td,
  Th,
} from '@/shared/ui';
import { FormattedDate } from '@/shared/ui/formatted-date';
import { Ban, Snowflake } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { generateGuestCode, invalidateGuestCode, invalidateUsersByCode } from '../actions/guest-actions';

interface GuestCode {
  code: string;
  title: string;
  createdBy: string;
  disabledAt: Date | null;
  createdAt: Date;
  creator?: {
    name: string | null;
  };
}

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
      toast.success('ゲストコードを発行しました');
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
      <Card className="space-y-4 p-6">
        <AdminSectionTitle>新規ゲストコード発行</AdminSectionTitle>
        <div className="flex flex-wrap gap-3">
          <Label className="min-w-0 flex-1 basis-full sm:basis-auto">
            用途
            <Input
              type="text"
              placeholder="例: 第3回 えま杯"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Label>
          <Button onClick={handleGenerate} disabled={isGenerating || !title} className="self-end">
            {isGenerating ? '発行中...' : 'コード発行'}
          </Button>
        </div>
      </Card>

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
          {codes.length === 0 && <TableEmptyRow colSpan={6}>発行済みのコードはありません</TableEmptyRow>}
          {codes.map((code) => (
            <TableRow key={code.code}>
              <Td className="text-text-main font-mono font-semibold">{code.code}</Td>
              <Td className="text-text-main max-w-[200px] truncate" title={code.title}>
                {code.title}
              </Td>
              <Td className="text-text-sub">{code.creator?.name || '不明'}</Td>
              <Td className="text-text-sub">
                <FormattedDate date={code.createdAt} />
              </Td>
              <Td>
                {code.disabledAt ? <Badge variant="status" label="無効" /> : <Badge variant="status" label="有効" />}
              </Td>
              <Td className="text-right font-semibold">
                <div className="flex justify-end space-x-2">
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-text-sub hover:text-error"
                        aria-label={`${code.title} のユーザーを凍結`}
                      >
                        <Snowflake className="h-4 w-4" />
                      </Button>
                    }
                    title="ユーザーの一括凍結"
                    description="このコードで登録した全てのユーザーを凍結します。凍結したユーザーはログインできなくなります。"
                    confirmLabel="凍結する"
                    onConfirm={() => handleInvalidateUsers(code.code)}
                  />
                  {!code.disabledAt && (
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-text-sub hover:text-error"
                          aria-label={`${code.title} を無効化`}
                        >
                          <Ban className="h-4 w-4" />
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
