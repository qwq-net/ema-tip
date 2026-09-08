'use client';

import {
  DIRECTION_LABELS,
  RACE_GRADE_LABELS,
  RACE_GRADES,
  RACE_SURFACES,
  RACE_TYPE_LABELS,
  RACE_TYPES,
  VENUE_DIRECTIONS,
} from '@/shared/constants/race';
import { toast } from '@/shared/lib/toast';
import { Input, Label, NumericInput, Select, SubmitButton } from '@/shared/ui';
import { preventEnterSubmit } from '@/shared/utils/form';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { createRaceDefinition, updateRaceDefinition } from '../actions';

interface RaceDefinitionFormProps {
  initialData?: {
    id: string;
    name: string;
    code?: string | null;
    grade: string;
    type: string;
    defaultDirection: string;
    defaultDistance: number;
    defaultVenueId: string;
    defaultSurface: string;
  };
  venues: { id: string; name: string; defaultDirection?: string }[];
  /** 保存に成功したあとに遷移する先のパス */
  redirectTo: string;
}

export function RaceDefinitionForm({ initialData, venues, redirectTo }: RaceDefinitionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const venueSelectRef = useRef<HTMLSelectElement>(null);
  const directionSelectRef = useRef<HTMLSelectElement>(null);
  const [distance, setDistance] = useState(initialData?.defaultDistance ?? 2400);

  async function handleSubmit(formData: FormData) {
    // NumericInput に min を渡すと打ち直しの途中値まで弾かれるため、下限は送信時に確かめます
    if (distance < 100) {
      toast.error('距離は 100m 以上で入力してください');
      return;
    }
    // NumericInput は表示値に桁区切りを入れるため、数値は state から詰め直します
    formData.set('defaultDistance', String(distance));
    try {
      if (initialData) {
        await updateRaceDefinition(initialData.id, formData);
        toast.success('レースマスタを更新しました');
      } else {
        await createRaceDefinition(formData);
        formRef.current?.reset();
        setDistance(2400);
        toast.success('レースマスタを登録しました');
      }
      router.push(redirectTo);
    } catch (error) {
      console.error(error);
      toast.error(initialData ? '更新に失敗しました' : '登録に失敗しました');
    }
  }

  const handleVenueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const venueId = e.target.value;
    const selectedVenue = venues.find((v) => v.id === venueId);
    if (selectedVenue?.defaultDirection && directionSelectRef.current && !initialData) {
      directionSelectRef.current.value = selectedVenue.defaultDirection;
    }
  };

  return (
    <form ref={formRef} action={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Label className="sm:col-span-2">
          レース名
          <Input name="name" type="text" required defaultValue={initialData?.name} />
        </Label>
        <Label>
          格付け
          <Select name="grade" required defaultValue={initialData?.grade || 'G1'}>
            {RACE_GRADES.map((grade) => (
              <option key={grade} value={grade}>
                {RACE_GRADE_LABELS[grade]}
              </option>
            ))}
          </Select>
        </Label>
        <Label>
          種別
          <Select name="type" required defaultValue={initialData?.type || 'REAL'}>
            {RACE_TYPES.map((type) => (
              <option key={type} value={type}>
                {RACE_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Label>
      </div>

      <Label>
        競馬場
        <Select
          name="defaultVenueId"
          required
          defaultValue={initialData?.defaultVenueId || ''}
          ref={venueSelectRef}
          onChange={handleVenueChange}
        >
          <option value="" disabled>
            競馬場を選択
          </option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </Select>
      </Label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label>
          距離
          <NumericInput value={distance} onChange={setDistance} suffix="m" />
        </Label>
        <Label>
          既定の馬場
          <Select name="defaultSurface" required defaultValue={initialData?.defaultSurface || '芝'}>
            {RACE_SURFACES.map((surface) => (
              <option key={surface} value={surface}>
                {surface}
              </option>
            ))}
          </Select>
        </Label>
      </div>

      <div>
        <Label>
          方向
          <Select
            name="direction"
            required
            defaultValue={initialData?.defaultDirection || 'RIGHT'}
            ref={directionSelectRef}
            aria-describedby="direction-help"
          >
            {VENUE_DIRECTIONS.map((dir) => (
              <option key={dir} value={dir}>
                {DIRECTION_LABELS[dir]}
              </option>
            ))}
          </Select>
        </Label>
        <p id="direction-help" className="text-text-sub mt-1 text-sm">
          選択した競馬場の方向が自動選択されます
        </p>
      </div>

      <SubmitButton className="w-full">{initialData ? '更新する' : '登録する'}</SubmitButton>
    </form>
  );
}
