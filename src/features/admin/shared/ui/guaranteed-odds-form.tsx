'use client';

import { GuaranteedOddsInputs } from '@/features/admin/shared/ui/guaranteed-odds-inputs';
import { AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { toast } from '@/shared/lib/toast';
import { Button } from '@/shared/ui';
import type { ActionResult } from '@/shared/utils/action-result';
import { preventEnterSubmit } from '@/shared/utils/form';
import { Coins } from 'lucide-react';
import { useState, useTransition } from 'react';

interface GuaranteedOddsFormProps {
  title: string;
  description: string;
  initialOdds: Record<string, number>;
  placeholders: Record<string, number>;
  // 保存先だけが画面ごとに異なる。失敗時の文言はそのままトーストに出す
  action: (odds: Record<string, number>) => Promise<ActionResult<void>>;
  successMessage: string;
}

// 券種別の保証オッズを編集して保存するカード。空欄は 0 として扱い、保存時にキーごと落ちる
export function GuaranteedOddsForm({
  title,
  description,
  initialOdds,
  placeholders,
  action,
  successMessage,
}: GuaranteedOddsFormProps) {
  const [odds, setOdds] = useState(initialOdds);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await action(odds);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={preventEnterSubmit}
      className="rounded-surface border border-gray-100 bg-white p-6"
    >
      <div className="mb-4 border-b border-gray-50 pb-4">
        <AdminSectionTitle icon={Coins}>{title}</AdminSectionTitle>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-gray-500">{description}</p>
        <GuaranteedOddsInputs value={odds} onChange={setOdds} placeholders={placeholders} />
        <Button type="submit" disabled={isPending} className="w-full font-semibold">
          {isPending ? '更新中...' : '設定を保存'}
        </Button>
      </div>
    </form>
  );
}
