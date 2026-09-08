'use client';

import { DIRECTION_LABELS, VENUE_DIRECTIONS } from '@/shared/constants/race';
import { toast } from '@/shared/lib/toast';
import { Input, Label, Select, SubmitButton } from '@/shared/ui';
import { preventEnterSubmit } from '@/shared/utils/form';
import { useRouter } from 'next/navigation';
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
  /** 保存に成功したあとに遷移する先のパス */
  redirectTo: string;
}

export function VenueForm({ initialData, redirectTo }: VenueFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    try {
      if (initialData) {
        await updateVenue(initialData.id, formData);
        toast.success('競馬場情報を更新しました');
      } else {
        await createVenue(formData);
        formRef.current?.reset();
        toast.success('競馬場を登録しました');
      }
      router.push(redirectTo);
    } catch (error) {
      console.error(error);
      toast.error(initialData ? '更新に失敗しました' : '登録に失敗しました');
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-5">
      <Label>
        競馬場名
        <Input name="name" type="text" required defaultValue={initialData?.name} placeholder="例: 東京競馬場" />
      </Label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label>
          コード
          <Input name="code" type="text" maxLength={2} defaultValue={initialData?.code || ''} placeholder="例: 05" />
        </Label>

        <Label>
          略称
          <Input
            name="shortName"
            type="text"
            required
            maxLength={3}
            defaultValue={initialData?.shortName}
            placeholder="例: 東京"
          />
        </Label>

        <Label>
          回り
          <Select name="direction" required defaultValue={initialData?.direction || 'RIGHT'}>
            {VENUE_DIRECTIONS.map((dir) => (
              <option key={dir} value={dir}>
                {DIRECTION_LABELS[dir]}
              </option>
            ))}
          </Select>
        </Label>

        <Label>
          地域
          <Select name="area" required defaultValue={initialData?.area || 'EAST_JAPAN'}>
            <option value="EAST_JAPAN">東日本</option>
            <option value="WEST_JAPAN">西日本</option>
            <option value="OVERSEAS">海外</option>
          </Select>
        </Label>
      </div>

      <SubmitButton className="w-full">{initialData ? '更新する' : '登録する'}</SubmitButton>
    </form>
  );
}
