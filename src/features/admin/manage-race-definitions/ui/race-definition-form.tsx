'use client';

import { DIRECTION_LABELS, RACE_GRADES, RACE_SURFACES, RACE_TYPES, VENUE_DIRECTIONS } from '@/shared/constants/race';
import { Input, Label, Select, SubmitButton } from '@/shared/ui';
import { preventEnterSubmit } from '@/shared/utils/form';
import { useRef } from 'react';
import { toast } from 'sonner';
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
  venues: Array<{ id: string; name: string; defaultDirection?: string }>;
  onSuccess?: () => void;
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

export function RaceDefinitionForm({ initialData, venues, onSuccess }: RaceDefinitionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

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
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error(initialData ? '更新に失敗しました' : '登録に失敗しました');
    }
  }

  const handleVenueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const venueId = e.target.value;
    const selectedVenue = venues.find((v) => v.id === venueId);
    if (selectedVenue && selectedVenue.defaultDirection && directionSelectRef.current && !initialData) {
      directionSelectRef.current.value = selectedVenue.defaultDirection;
    }
  };

  return (
    <form ref={formRef} action={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Label>レース名</Label>
          <Input name="name" type="text" required defaultValue={initialData?.name} />
        </div>
        <div>
          <Label>格付け</Label>
          <Select name="grade" required defaultValue={initialData?.grade || 'G1'}>
            {RACE_GRADES.map((grade) => (
              <option key={grade} value={grade}>
                {GRADE_LABELS[grade] || grade}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>種別</Label>
          <Select name="type" required defaultValue={initialData?.type || 'REAL'}>
            {RACE_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type] || type}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>開催会場</Label>
          <Select
            name="defaultVenueId"
            required
            defaultValue={initialData?.defaultVenueId || ''}
            ref={venueSelectRef}
            onChange={handleVenueChange}
          >
            <option value="" disabled>
              会場を選択
            </option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>距離 (m)</Label>
          <Input
            name="defaultDistance"
            type="number"
            required
            min={100}
            defaultValue={initialData?.defaultDistance || 2400}
            placeholder="2400"
          />
        </div>
        <div>
          <Label>馬場 (デフォルト)</Label>
          <Select name="defaultSurface" required defaultValue={initialData?.defaultSurface || '芝'}>
            {RACE_SURFACES.map((surface) => (
              <option key={surface} value={surface}>
                {surface}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label>方向</Label>
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
        <p className="mt-1 text-sm text-gray-500">選択した会場の方向が自動選択されます</p>
      </div>

      <SubmitButton className="from-primary to-primary/80 hover:to-primary w-full bg-linear-to-r shadow-md transition-all hover:shadow-lg">
        {initialData ? '更新する' : '登録する'}
      </SubmitButton>
    </form>
  );
}
