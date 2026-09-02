'use client';

import { DIRECTION_LABELS, VENUE_DIRECTIONS } from '@/shared/constants/race';
import { toast } from '@/shared/lib/toast';
import { Input, Label, Select, SubmitButton } from '@/shared/ui';
import { preventEnterSubmit } from '@/shared/utils/form';
import { useRef } from 'react';
import { createVenue, updateVenue } from '../actions';

interface VenueFormProps {
  initialData?: {
    id: string;
    name: string;
    shortName: string;
    code?: string | null;
    direction: 'LEFT' | 'RIGHT' | 'STRAIGHT';
    area: 'EAST_JAPAN' | 'WEST_JAPAN' | 'OVERSEAS';
  };
  onSuccess?: () => void;
}

export function VenueForm({ initialData, onSuccess }: VenueFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    try {
      if (initialData) {
        await updateVenue(initialData.id, formData);
        toast.success('会場情報を更新しました');
      } else {
        await createVenue(formData);
        formRef.current?.reset();
        toast.success('会場を登録しました');
      }
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error(initialData ? '更新に失敗しました' : '登録に失敗しました');
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-5">
      <div>
        <Label>会場名 (例: 東京競馬場)</Label>
        <Input name="name" type="text" required defaultValue={initialData?.name} placeholder="例: 東京競馬場" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>コード (例: 05)</Label>
          <Input name="code" type="text" maxLength={2} defaultValue={initialData?.code || ''} placeholder="05" />
        </div>

        <div>
          <Label>略称 (例: 東京)</Label>
          <Input
            name="shortName"
            type="text"
            required
            maxLength={3}
            defaultValue={initialData?.shortName}
            placeholder="例: 東京"
          />
        </div>

        <div>
          <Label>回り</Label>
          <Select name="direction" required defaultValue={initialData?.direction || 'RIGHT'}>
            {VENUE_DIRECTIONS.map((dir) => (
              <option key={dir} value={dir}>
                {DIRECTION_LABELS[dir]}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>地域</Label>
          <Select name="area" required defaultValue={initialData?.area || 'EAST_JAPAN'}>
            <option value="EAST_JAPAN">東日本</option>
            <option value="WEST_JAPAN">西日本</option>
            <option value="OVERSEAS">海外</option>
          </Select>
        </div>
      </div>

      <SubmitButton className="from-primary to-primary/80 hover:to-primary w-full bg-linear-to-r shadow-md transition-all hover:shadow-lg">
        {initialData ? '更新する' : '登録する'}
      </SubmitButton>
    </form>
  );
}
