'use client';

import { BET_TYPE_LABELS, BET_TYPE_ORDER, BetType } from '@/entities/bet';
import { toast } from '@/shared/lib/toast';
import { Checkbox, Input, Label, NumericInput, SubmitButton, Textarea } from '@/shared/ui';
import { todayJST } from '@/shared/utils/date';
import { preventEnterSubmit } from '@/shared/utils/form';
import { Calendar } from 'lucide-react';
import { useRef, useState } from 'react';
import { createEvent, updateEvent } from '../actions';

interface EventFormProps {
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    distributeAmount: number;
    loanAmount: number | null;
    loanEnabled: boolean;
    loanThresholdPercent: number;
    date: string;
    defaultAllowedBetTypes: BetType[] | null;
  };
  onSuccess?: () => void;
}

export function EventForm({ initialData, onSuccess }: EventFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [date, setDate] = useState(initialData?.date || todayJST());
  const [distributeAmount, setDistributeAmount] = useState(initialData?.distributeAmount ?? 100000);
  const [loanAmount, setLoanAmount] = useState<number | null>(initialData?.loanAmount ?? null);
  const [loanEnabled, setLoanEnabled] = useState(initialData?.loanEnabled ?? true);
  const [loanThresholdPercent, setLoanThresholdPercent] = useState(initialData?.loanThresholdPercent ?? 30);
  const [restrictBetTypes, setRestrictBetTypes] = useState(initialData?.defaultAllowedBetTypes != null);
  const [allowedBetTypes, setAllowedBetTypes] = useState<Set<BetType>>(
    new Set(initialData?.defaultAllowedBetTypes ?? BET_TYPE_ORDER)
  );

  const toggleBetType = (type: BetType) => {
    setAllowedBetTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  async function handleSubmit(formData: FormData) {
    try {
      const types = restrictBetTypes ? BET_TYPE_ORDER.filter((t) => allowedBetTypes.has(t)) : null;
      if (types && types.length === 0) {
        toast.error('馬券種別を1種類以上選択してください');
        return;
      }
      formData.set('allowedBetTypes', JSON.stringify(types));
      formData.set('distributeAmount', distributeAmount.toString());
      formData.set('loanEnabled', String(loanEnabled));
      formData.set('loanThresholdPercent', loanThresholdPercent.toString());
      if (loanAmount !== null) {
        formData.set('loanAmount', loanAmount.toString());
      }
      if (initialData) {
        await updateEvent(initialData.id, formData);
        toast.success('イベント情報を更新しました');
      } else {
        await createEvent(formData);
        formRef.current?.reset();
        setDate(todayJST());
        setDistributeAmount(100000);
        setLoanAmount(null);
        setRestrictBetTypes(false);
        setAllowedBetTypes(new Set(BET_TYPE_ORDER));
        toast.success('イベントを作成しました');
      }
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error(initialData ? '更新に失敗しました' : '作成に失敗しました');
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-5">
      <div>
        <Label>イベント名</Label>
        <Input name="name" required defaultValue={initialData?.name} placeholder="例: 第1回 拠り所杯" />
      </div>

      <div>
        <Label>説明 (任意)</Label>
        <Textarea
          name="description"
          defaultValue={initialData?.description || ''}
          rows={3}
          placeholder="イベントの詳細や説明を入力"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>配布金額</Label>
          <div className="relative">
            <NumericInput value={distributeAmount} onChange={setDistributeAmount} min={0} className="pr-8" />
            <span className="text-text-sub absolute top-2 right-3 text-sm">円</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">初期資金として配布されます</p>
        </div>

        <div>
          <Label>借入金額 (任意)</Label>
          <div className="relative">
            <NumericInput
              value={loanAmount ?? 0}
              onChange={(v) => setLoanAmount(v === 0 ? null : v)}
              min={0}
              className="pr-8"
              placeholder="配布金額と同額"
            />
            <span className="text-text-sub absolute top-2 right-3 text-sm">円</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">空欄の場合は配布金額と同額</p>
        </div>

        <div>
          <Label htmlFor="loanEnabled">借入機能</Label>
          <label
            htmlFor="loanEnabled"
            className="rounded-control flex w-full items-center gap-2 border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <Checkbox id="loanEnabled" checked={loanEnabled} onCheckedChange={setLoanEnabled} />
            借入機能を有効にする
          </label>
          <p className="mt-1 text-sm text-gray-500">無効にすると融資の案内が一切出ません</p>
        </div>

        <div>
          <Label htmlFor="loanThresholdPercent">融資の発生条件</Label>
          <div className="relative">
            <NumericInput
              id="loanThresholdPercent"
              value={loanThresholdPercent}
              onChange={setLoanThresholdPercent}
              min={0}
              max={100}
              disabled={!loanEnabled}
              className="pr-8"
            />
            <span className="text-text-sub absolute top-2 right-3 text-sm">%</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">残高が配布金額のこの割合以下になると案内します</p>
        </div>

        <div>
          <Label>開催日</Label>
          <div className="relative">
            <div className="focus-within:ring-primary/20 focus-within:border-primary rounded-control flex w-full items-center gap-2 border border-gray-300 bg-white px-3 py-2 text-sm transition focus-within:ring-2 focus-within:outline-none">
              <Calendar className="text-text-sub h-4 w-4" />
              <span className="text-gray-900">{date.replace(/-/g, '/')}</span>
            </div>

            <input
              name="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="restrictBetTypes">購入可能な馬券種別</Label>
          <label
            htmlFor="restrictBetTypes"
            className="rounded-control flex w-full items-center gap-2 border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <Checkbox id="restrictBetTypes" checked={restrictBetTypes} onCheckedChange={setRestrictBetTypes} />
            馬券種別を制限する
          </label>
          <p className="mt-1 text-sm text-gray-500">
            このイベントの全レースに適用されるデフォルトです。レース側の個別設定が優先されます
          </p>
        </div>

        {restrictBetTypes && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BET_TYPE_ORDER.map((type) => (
              <label
                key={type}
                className="rounded-control flex items-center gap-2 border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <Checkbox checked={allowedBetTypes.has(type)} onCheckedChange={() => toggleBetType(type)} />
                {BET_TYPE_LABELS[type]}
              </label>
            ))}
          </div>
        )}
      </div>

      <SubmitButton className="mt-2 w-full" size="lg">
        {initialData ? 'イベント更新' : 'イベント作成'}
      </SubmitButton>
    </form>
  );
}
