'use client';

import { toast } from '@/shared/lib/toast';
import {
  Button,
  Card,
  ConfirmDialog,
  Input,
  Label,
  SectionTitle,
  TableBody,
  TableEmptyRow,
  TableHead,
  TableRow,
  TableShell,
  Td,
  Th,
} from '@/shared/ui';
import { FormattedDate } from '@/shared/ui/formatted-date';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { addAdminDiscordId, removeAdminDiscordId } from '../actions';

interface AdminDiscordIdEntry {
  discordId: string;
  label: string;
  createdAt: Date;
  creator?: {
    name: string | null;
  } | null;
}

export function DiscordAdminList({ entries }: { entries: AdminDiscordIdEntry[] }) {
  const [discordId, setDiscordId] = useState('');
  const [label, setLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      const result = await addAdminDiscordId(discordId, label);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setDiscordId('');
      setLabel('');
      toast.success('Discord ID を登録しました');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (entry: AdminDiscordIdEntry) => {
    const result = await removeAdminDiscordId(entry.discordId);
    if (!result.success) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success(`${entry.label} を一覧から外しました`);
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-6">
        <SectionTitle>Discord ID の追加</SectionTitle>
        <div className="flex flex-wrap gap-3">
          <Label className="min-w-0 flex-1 basis-full sm:basis-auto">
            Discord ID
            <Input
              type="text"
              inputMode="numeric"
              placeholder="例: 988442447187165254"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value)}
            />
          </Label>
          <Label className="min-w-0 flex-1 basis-full sm:basis-auto">
            表示名
            <Input
              type="text"
              placeholder="例: いんたーねっと"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </Label>
          <Button onClick={handleAdd} disabled={isAdding || !discordId || !label} className="self-end">
            {isAdding ? '登録中...' : '登録'}
          </Button>
        </div>
      </Card>

      <TableShell>
        <TableHead>
          <Th>Discord ID</Th>
          <Th>表示名</Th>
          <Th>追加者</Th>
          <Th>追加日</Th>
          <Th className="text-right">操作</Th>
        </TableHead>
        <TableBody>
          {entries.length === 0 && <TableEmptyRow colSpan={5}>登録されている Discord ID はありません</TableEmptyRow>}
          {entries.map((entry) => (
            <TableRow key={entry.discordId}>
              <Td className="text-text-main font-mono">{entry.discordId}</Td>
              <Td className="text-text-main max-w-[200px] truncate" title={entry.label}>
                {entry.label}
              </Td>
              <Td className="text-text-sub">{entry.creator?.name || 'シード'}</Td>
              <Td className="text-text-sub">
                <FormattedDate date={entry.createdAt} />
              </Td>
              <Td className="text-right">
                <div className="flex justify-end">
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-text-sub hover:text-error"
                        aria-label={`${entry.label} を一覧から外す`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    title="Discord ID の削除"
                    description="この ID で新しく登録する人は一般利用者になります。登録済みの利用者の役割は変わりません。"
                    confirmLabel="削除する"
                    onConfirm={() => handleRemove(entry)}
                  />
                </div>
              </Td>
            </TableRow>
          ))}
        </TableBody>
      </TableShell>
    </div>
  );
}
