'use client';

import { HorseTagType } from '@/entities/horse';
import { HORSE_TAG_TYPES } from '@/shared/constants/horse';
import { HORSE_TAG_CATEGORIES } from '@/shared/constants/horse-tags';
import { toast } from '@/shared/lib/toast';
import { Input, Label, Select, SubmitButton } from '@/shared/ui';
import { preventEnterSubmit } from '@/shared/utils/form';
import { narrowToOption } from '@/shared/utils/lookup';
import { useRef, useState } from 'react';
import { createHorseTag, updateHorseTag } from '../actions';

interface HorseTagFormProps {
  initialData?: {
    id: string;
    type: HorseTagType;
    content: string;
  };
  onSuccess?: () => void;
}

export function HorseTagForm({ initialData, onSuccess }: HorseTagFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<HorseTagType>(initialData?.type || 'CHARACTERISTIC');

  async function handleSubmit(formData: FormData) {
    try {
      if (initialData) {
        await updateHorseTag(initialData.id, formData);
        toast.success('タグを更新しました');
      } else {
        await createHorseTag(formData);
        formRef.current?.reset();
        toast.success('タグを登録しました');
      }
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error('エラーが発生しました');
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>種別</Label>
        <Select
          name="type"
          value={type}
          onChange={(e) => setType(narrowToOption(HORSE_TAG_TYPES, e.target.value) ?? 'LEG_TYPE')}
          required
        >
          {HORSE_TAG_TYPES.map((t) => (
            <option key={t} value={t}>
              {HORSE_TAG_CATEGORIES[t] || t}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label>内容</Label>
        <Input name="content" defaultValue={initialData?.content} placeholder="例: 逃げ, G1, ~1200m" required />
      </div>

      <SubmitButton className="from-primary to-primary/80 w-full bg-linear-to-r">
        {initialData ? '更新する' : '登録する'}
      </SubmitButton>
    </form>
  );
}
