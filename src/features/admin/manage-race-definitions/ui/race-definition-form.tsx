'use client';

import { DIRECTION_LABELS, RACE_GRADES, RACE_SURFACES, RACE_TYPES, VENUE_DIRECTIONS } from '@/shared/constants/race';
import { toast } from '@/shared/lib/toast';
import { Input, Label, Select, SubmitButton } from '@/shared/ui';
import { preventEnterSubmit } from '@/shared/utils/form';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
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

const GRADE_LABELS = {
  G1: 'G1',
  G2: 'G2',
  G3: 'G3',
  L: 'L (リステッド)',
  OP: 'OP (オープン)',
  '3_WIN': '3勝クラス',
  '2_WIN': '2勝クラス',
  '1_WIN': '1勝クラス',
  MAIDEN: '未勝利',
  NEWCOMER: '新馬',
} satisfies Record<string, string>;

const TYPE_LABELS = {
  REAL: '実在',
  FICTIONAL: '架空',
} satisfies Record<string, string>;

export function RaceDefinitionForm({ initialData, venues, redirectTo }: RaceDefinitionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const venueSelectRef = useRef<HTMLSelectElement>(null);
  const directionSelectRef = useRef<HTMLSelectElement>(null);

  async function handleSubmit(formData: FormData) {
    try {
      if (initialData) {
        await updateRaceDefinition(initialData.id, formData);
        toast.success('レース定義を更新しました');
      } else {
        await createRaceDefinition(formData);
        formRef.current?.reset();
        toast.success('レース定義を登録しました');
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
                {GRADE_LABELS[grade] || grade}
              </option>
            ))}
          </Select>
        </Label>
        <Label>
          種別
          <Select name="type" required defaultValue={initialData?.type || 'REAL'}>
            {RACE_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type] || type}
              </option>
            ))}
          </Select>
        </Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label>
          距離
          <span className="relative block">
            <Input
              name="defaultDistance"
              type="number"
              required
              min={100}
              defaultValue={initialData?.defaultDistance ?? 2400}
              placeholder="2400"
              className="pr-8"
            />
            <span className="text-text-sub absolute top-2 right-3 text-sm">m</span>
          </span>
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
          >
            {VENUE_DIRECTIONS.map((dir) => (
              <option key={dir} value={dir}>
                {DIRECTION_LABELS[dir]}
              </option>
            ))}
          </Select>
        </Label>
        <p className="text-text-sub mt-1 text-sm">選択した競馬場の方向が自動選択されます</p>
      </div>

      <SubmitButton className="w-full">{initialData ? '更新する' : '登録する'}</SubmitButton>
    </form>
  );
}
