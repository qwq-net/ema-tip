'use client';

import { GuaranteedOddsInputs } from '@/features/admin/shared/ui/guaranteed-odds-inputs';
import { AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { toast } from '@/shared/lib/toast';
import { Button } from '@/shared/ui';
import { preventEnterSubmit } from '@/shared/utils/form';
import { useState, useTransition } from 'react';
import { updateGuaranteedOdds } from '../actions/update-odds';

interface RaceGuaranteedOddsFormProps {
  raceId: string;
  initialOdds?: Record<string, number> | null;
  hideHeader?: boolean;
}

export function RaceGuaranteedOddsForm({ raceId, initialOdds, hideHeader = false }: RaceGuaranteedOddsFormProps) {
  const [odds, setOdds] = useState<Record<string, number>>(initialOdds || {});
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateGuaranteedOdds(raceId, odds);
        toast.success('保証オッズを更新しました');
      } catch (error) {
        console.error(error);
        toast.error('更新に失敗しました');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {!hideHeader && (
          <>
            <AdminSectionTitle className="mb-4">保証オッズ設定</AdminSectionTitle>
            <p className="mb-6 text-sm text-gray-500">
              このレースに適用する保証オッズを設定します。設定された値より配当が低くなることはありません。
            </p>
          </>
        )}
        <GuaranteedOddsInputs value={odds} onChange={setOdds} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? '更新中...' : '設定を保存'}
        </Button>
      </div>
    </form>
  );
}
