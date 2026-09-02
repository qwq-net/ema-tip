'use client';

import { BET_TYPE_LABELS, BET_TYPE_ORDER, BetType } from '@/entities/bet';
import { AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { toast } from '@/shared/lib/toast';
import { Button, Checkbox } from '@/shared/ui';
import { Ticket } from 'lucide-react';
import { useState, useTransition } from 'react';
import { updateRaceAllowedBetTypes } from '../actions/update-bet-types';

interface RaceBetTypesFormProps {
  raceId: string;
  // このレース自身の設定。null はイベント設定に従う状態
  initialTypes: BetType[] | null;
  // 参考表示用のイベント側デフォルト。null は制限なし
  eventDefaultTypes: BetType[] | null;
}

export function RaceBetTypesForm({ raceId, initialTypes, eventDefaultTypes }: RaceBetTypesFormProps) {
  const [isCustom, setIsCustom] = useState(initialTypes !== null);
  const [selected, setSelected] = useState<Set<BetType>>(new Set(initialTypes ?? BET_TYPE_ORDER));
  const [isPending, startTransition] = useTransition();

  const toggleType = (type: BetType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleSave = () => {
    const types = isCustom ? BET_TYPE_ORDER.filter((t) => selected.has(t)) : null;
    if (types && types.length === 0) {
      toast.error('1種類以上選択してください');
      return;
    }
    startTransition(async () => {
      try {
        await updateRaceAllowedBetTypes(raceId, types);
        toast.success('購入可能な馬券種別を更新しました');
      } catch (error) {
        console.error(error);
        toast.error('更新に失敗しました');
      }
    });
  };

  const eventDefaultLabel = eventDefaultTypes
    ? eventDefaultTypes.map((t) => BET_TYPE_LABELS[t]).join('・')
    : '制限なし';

  return (
    <div className="rounded-surface border border-gray-100 bg-white p-6">
      <div className="mb-4 border-b border-gray-50 pb-4">
        <AdminSectionTitle icon={Ticket}>購入可能な馬券種別</AdminSectionTitle>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm text-gray-900">
          <Checkbox
            checked={isCustom}
            onCheckedChange={(checked) => setIsCustom(checked === true)}
            disabled={isPending}
          />
          このレースで個別に指定する
        </label>

        {isCustom ? (
          <div className="grid grid-cols-2 gap-2">
            {BET_TYPE_ORDER.map((type) => (
              <label
                key={type}
                className="rounded-control flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <Checkbox checked={selected.has(type)} onCheckedChange={() => toggleType(type)} disabled={isPending} />
                {BET_TYPE_LABELS[type]}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            イベントの設定に従います。現在のイベント設定: <span className="font-semibold">{eventDefaultLabel}</span>
          </p>
        )}

        <Button onClick={handleSave} disabled={isPending} className="w-full font-semibold">
          {isPending ? '更新中...' : '設定を保存'}
        </Button>
      </div>
    </div>
  );
}
