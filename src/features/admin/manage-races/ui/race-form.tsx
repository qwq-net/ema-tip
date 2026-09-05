'use client';

import { DIRECTION_LABELS, RACE_CONDITIONS, RACE_SURFACES, VENUE_DIRECTIONS } from '@/shared/constants/race';
import { toast } from '@/shared/lib/toast';
import { Input, Label, Select, SubmitButton } from '@/shared/ui';
import { todayJST } from '@/shared/utils/date';
import { preventEnterSubmit } from '@/shared/utils/form';
import { lookup, narrowToOption } from '@/shared/utils/lookup';
import { Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { createRace, updateRace } from '../actions';

interface RaceFormProps {
  initialData?: {
    id: string;
    eventId: string;
    date: string;
    name: string;
    raceNumber?: number | null;
    distance: number;
    surface: '芝' | 'ダート';
    condition: '良' | '稍重' | '重' | '不良' | null;
    venueId?: string;
    raceDefinitionId?: string | null;
    direction?: string | null;
  };
  events: { id: string; name: string; date: string }[];
  raceDefinitions?: {
    id: string;
    name: string;
    grade: string;
    defaultDistance: number;
    defaultSurface: '芝' | 'ダート';
    defaultVenueId: string;
    defaultDirection: string;
  }[];
  venues?: { id: string; name: string; defaultDirection: string }[];
  /** 保存に成功したあとに遷移する先のパス */
  redirectTo: string;
}

// フォームが state で持つ入力値の一式
interface RaceFormValues {
  eventId: string;
  date: string;
  surface: (typeof RACE_SURFACES)[number];
  condition: (typeof RACE_CONDITIONS)[number];
  raceDefinitionId: string;
  venueId: string;
  direction: string;
  name: string;
  distance: number;
}

/**
 * 編集時は既存値、新規時は既定値でフォームの初期値を組む。
 * 登録後のリセットも initialData を渡さずに呼び、初期表示と同じ値へ戻す。
 */
function getInitialValues(initialData: RaceFormProps['initialData'], events: RaceFormProps['events']): RaceFormValues {
  const defaults: RaceFormValues = {
    eventId: events[0]?.id || '',
    date: todayJST(),
    surface: '芝',
    condition: '良',
    raceDefinitionId: '',
    venueId: '',
    direction: '',
    name: '',
    distance: 2400,
  };
  if (!initialData) return defaults;

  return {
    eventId: initialData.eventId || defaults.eventId,
    date: initialData.date || defaults.date,
    surface: initialData.surface,
    condition: initialData.condition || defaults.condition,
    raceDefinitionId: initialData.raceDefinitionId || defaults.raceDefinitionId,
    venueId: initialData.venueId || defaults.venueId,
    direction: initialData.direction || defaults.direction,
    name: initialData.name || defaults.name,
    distance: initialData.distance,
  };
}

export function RaceForm({ initialData, events, raceDefinitions = [], venues = [], redirectTo }: RaceFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const initialValues = getInitialValues(initialData, events);
  const [eventId, setEventId] = useState(initialValues.eventId);
  const [date, setDate] = useState(initialValues.date);
  const [surface, setSurface] = useState(initialValues.surface);
  const [condition, setCondition] = useState(initialValues.condition);

  const [raceDefinitionId, setRaceDefinitionId] = useState(initialValues.raceDefinitionId);
  const [venueId, setVenueId] = useState(initialValues.venueId);
  const [direction, setDirection] = useState(initialValues.direction);
  const [name, setName] = useState(initialValues.name);
  const [distance, setDistance] = useState(initialValues.distance);

  const handleDefinitionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const defId = e.target.value;
    setRaceDefinitionId(defId);

    const def = raceDefinitions.find((d) => d.id === defId);
    if (!def) return;

    setName(def.name);
    setDistance(def.defaultDistance);
    setSurface(def.defaultSurface);

    if (!def.defaultVenueId) return;
    setVenueId(def.defaultVenueId);

    // 定義が方向を持つならそれを優先し、持たないときだけ会場の既定方向で補う
    if (def.defaultDirection) {
      setDirection(def.defaultDirection);
      return;
    }

    const venue = venues.find((v) => v.id === def.defaultVenueId);
    if (venue) setDirection(venue.defaultDirection);
  };

  const handleVenueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vId = e.target.value;
    setVenueId(vId);
    if (!direction || !initialData) {
      const venue = venues.find((v) => v.id === vId);
      if (venue) setDirection(venue.defaultDirection);
    }
  };

  async function handleSubmit(formData: FormData) {
    try {
      if (initialData) {
        await updateRace(initialData.id, formData);
        toast.success('レース情報を更新しました');
      } else {
        await createRace(formData);
        formRef.current?.reset();
        const cleared = getInitialValues(undefined, events);
        setEventId(cleared.eventId);
        setDate(cleared.date);
        setSurface(cleared.surface);
        setCondition(cleared.condition);
        setRaceDefinitionId(cleared.raceDefinitionId);
        setVenueId(cleared.venueId);
        setDirection(cleared.direction);
        setName(cleared.name);
        setDistance(cleared.distance);

        toast.success('レースを登録しました');
      }
      router.push(redirectTo);
    } catch (error) {
      console.error(error);
      toast.error(initialData ? '更新に失敗しました' : '登録に失敗しました');
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-5">
      <div>
        <Label>イベント</Label>
        <Select name="eventId" required value={eventId} onChange={(e) => setEventId(e.target.value)}>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.date} - {event.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
              aria-label="開催日"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
        </div>

        <div>
          <Label>レース定義 (マスタから選択)</Label>
          <Select name="raceDefinitionId" value={raceDefinitionId} onChange={handleDefinitionChange}>
            <option value="">選択なし (手動入力)</option>
            {raceDefinitions.map((def) => (
              <option key={def.id} value={def.id}>
                {def.name} ({def.grade})
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>開催会場</Label>
          <Select name="venueId" required value={venueId} onChange={handleVenueChange}>
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

        <div>
          <Label>方向</Label>
          <Select name="direction" required value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="" disabled>
              方向を選択
            </option>
            {VENUE_DIRECTIONS.map((dir) => (
              <option key={dir} value={dir}>
                {DIRECTION_LABELS[dir]}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-sm text-gray-500">
            {venueId
              ? `会場のデフォルト: ${
                  lookup(DIRECTION_LABELS, venues.find((v) => v.id === venueId)?.defaultDirection ?? '') ?? '-'
                }`
              : '会場を選択してください'}
          </p>
        </div>
      </div>

      <div>
        <Label>レース名</Label>
        <Input
          name="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: ジャパンカップ"
        />
      </div>

      <div>
        <Label>レース番号（省略可）</Label>
        <Input
          name="raceNumber"
          type="number"
          min="1"
          defaultValue={initialData?.raceNumber ?? ''}
          placeholder="自動採番"
        />
        <p className="mt-1 text-sm text-gray-500">未入力の場合は自動で採番されます</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>距離 (m)</Label>
          <Input
            name="distance"
            type="number"
            min="100"
            required
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            placeholder="2400"
          />
        </div>

        <div>
          <Label>コース</Label>
          <div className="flex gap-2">
            {['芝', 'ダート'].map((s) => (
              <label
                key={s}
                className={`rounded-control flex flex-1 cursor-pointer items-center justify-center border px-4 py-2 text-sm font-medium transition ${
                  surface === s
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="surface"
                  value={s}
                  aria-label={s}
                  checked={surface === s}
                  onChange={(e) => setSurface(narrowToOption(RACE_SURFACES, e.target.value) ?? '芝')}
                  className="sr-only"
                />
                {s}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <Label>馬場状態</Label>
        <div className="flex gap-2">
          {['良', '稍重', '重', '不良'].map((c) => (
            <label
              key={c}
              className={`rounded-control flex flex-1 cursor-pointer items-center justify-center border px-3 py-2 text-sm font-medium transition ${
                condition === c
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="condition"
                value={c}
                aria-label={c}
                checked={condition === c}
                onChange={(e) => setCondition(narrowToOption(RACE_CONDITIONS, e.target.value) ?? '良')}
                className="sr-only"
              />
              {c}
            </label>
          ))}
        </div>
      </div>

      <SubmitButton className="w-full">{initialData ? '更新する' : '登録する'}</SubmitButton>
    </form>
  );
}
