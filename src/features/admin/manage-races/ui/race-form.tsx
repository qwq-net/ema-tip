'use client';

import { DIRECTION_LABELS, RACE_CONDITIONS, RACE_SURFACES, VENUE_DIRECTIONS } from '@/shared/constants/race';
import { Button, Input, Label, Select } from '@/shared/ui';
import { preventEnterSubmit } from '@/shared/utils/form';
import { lookup, narrowToOption } from '@/shared/utils/lookup';
import { Calendar } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
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
  events: Array<{ id: string; name: string; date: string }>;
  raceDefinitions?: Array<{
    id: string;
    name: string;
    grade: string;
    defaultDistance: number;
    defaultSurface: string;
    defaultVenueId: string;
    defaultDirection: string;
  }>;
  venues?: Array<{ id: string; name: string; defaultDirection: string }>;
  onSuccess?: () => void;
}

export function RaceForm({ initialData, events, raceDefinitions = [], venues = [], onSuccess }: RaceFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [eventId, setEventId] = useState(initialData?.eventId || events[0]?.id || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [surface, setSurface] = useState(initialData?.surface || '芝');
  const [condition, setCondition] = useState(initialData?.condition || '良');

  const [raceDefinitionId, setRaceDefinitionId] = useState(initialData?.raceDefinitionId || '');
  const [venueId, setVenueId] = useState(initialData?.venueId || '');
  const [direction, setDirection] = useState(initialData?.direction || '');
  const [name, setName] = useState(initialData?.name || '');
  const [distance, setDistance] = useState(initialData?.distance || 2400);

  const handleDefinitionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const defId = e.target.value;
    setRaceDefinitionId(defId);

    const def = raceDefinitions.find((d) => d.id === defId);
    if (def) {
      setName(def.name);
      setDistance(def.defaultDistance);
      setSurface(narrowToOption(RACE_SURFACES, def.defaultSurface) ?? '芝');

      if (def.defaultVenueId) {
        setVenueId(def.defaultVenueId);
        if (def.defaultDirection) {
          setDirection(def.defaultDirection);
        } else {
          const venue = venues.find((v) => v.id === def.defaultVenueId);
          if (venue) setDirection(venue.defaultDirection);
        }
      }
    }
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
        setEventId(events[0]?.id || '');
        setDate(new Date().toISOString().split('T')[0]);
        setSurface('芝');
        setCondition('良');
        setRaceDefinitionId('');
        setVenueId('');
        setDirection('');
        setName('');
        setDistance(2400);

        toast.success('レースを登録しました');
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
            <div className="focus-within:ring-primary/20 focus-within:border-primary flex w-full items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-all focus-within:ring-2 focus-within:outline-none">
              <Calendar className="h-4 w-4 text-gray-400" />
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
              ? '会場のデフォルト: ' +
                (lookup(DIRECTION_LABELS, venues.find((v) => v.id === venueId)?.defaultDirection ?? '') ?? '-')
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
          defaultValue={initialData?.raceNumber || ''}
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
                className={`flex flex-1 cursor-pointer items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-all ${
                  surface === s
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="surface"
                  value={s}
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
              className={`flex flex-1 cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-all ${
                condition === c
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="condition"
                value={c}
                checked={condition === c}
                onChange={(e) => setCondition(narrowToOption(RACE_CONDITIONS, e.target.value) ?? '良')}
                className="sr-only"
              />
              {c}
            </label>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        className="from-primary to-primary/80 hover:to-primary w-full bg-linear-to-r shadow-md transition-all hover:shadow-lg"
      >
        {initialData ? '更新する' : '登録する'}
      </Button>
    </form>
  );
}
