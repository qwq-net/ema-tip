'use client';
import { HORSE_TAG_CATEGORIES, HorseTagType } from '@/shared/constants/horse-tags';
import { Button, Input, Label, Select, Textarea } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import { preventEnterSubmit } from '@/shared/utils/form';
import { X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createHorse, updateHorse } from '../actions';

interface HorseFormProps {
  initialData?: {
    id: string;
    name: string;
    gender: '牡' | '牝' | 'セン';
    age: number | null;
    origin: 'DOMESTIC' | 'FOREIGN_BRED' | 'FOREIGN_TRAINED';
    notes: string | null;
    type: 'REAL' | 'FICTIONAL';
    tags: Array<{ type: string; content: string }>;
  };
  tagOptions: Array<{ id: string; type: HorseTagType; content: string }>;
  onSuccess?: () => void;
}

export function HorseForm({ initialData, tagOptions, onSuccess }: HorseFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [gender, setGender] = useState(initialData?.gender || '牡');
  const [type, setType] = useState(initialData?.type || 'REAL');
  const [tags, setTags] = useState<Array<{ type: string; content: string }>>(initialData?.tags || []);

  const toggleTag = (masterTag: { type: HorseTagType; content: string }) => {
    const exists = tags.some((t) => t.type === masterTag.type && t.content === masterTag.content);
    if (exists) {
      setTags(tags.filter((t) => !(t.type === masterTag.type && t.content === masterTag.content)));
    } else {
      setTags([...tags, { type: masterTag.type, content: masterTag.content }]);
    }
  };

  const categorizedMasterTags = useMemo(
    () => ({
      LEG_TYPE: tagOptions.filter((tag) => tag.type === 'LEG_TYPE'),
      CHARACTERISTIC: tagOptions.filter((tag) => tag.type === 'CHARACTERISTIC'),
      BIOGRAPHY: tagOptions.filter((tag) => tag.type === 'BIOGRAPHY'),
      OTHER: tagOptions.filter((tag) => tag.type === 'OTHER'),
    }),
    [tagOptions]
  );

  async function handleSubmit(formData: FormData) {
    try {
      formData.append('type', type);
      formData.append('tags', JSON.stringify(tags));

      if (initialData) {
        await updateHorse(initialData.id, formData);
        toast.success('馬情報を更新しました');
      } else {
        await createHorse(formData);
        formRef.current?.reset();
        setGender('牡');
        setType('REAL');
        setTags([]);
        toast.success('馬を登録しました');
      }
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error(initialData ? '更新に失敗しました' : '登録に失敗しました');
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>馬名</Label>
          <Input
            name="name"
            type="text"
            required
            defaultValue={initialData?.name}
            placeholder="例: ディープインパクト"
          />
        </div>
        <div>
          <Label>種別</Label>
          <div className="flex gap-2">
            {[
              { value: 'REAL', label: '実在' },
              { value: 'FICTIONAL', label: '架空' },
            ].map((t) => (
              <label
                key={t.value}
                className={`flex flex-1 cursor-pointer items-center justify-center rounded-md border px-2 py-2 text-sm font-medium transition-all ${
                  type === t.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="type_radio"
                  value={t.value}
                  checked={type === t.value}
                  onChange={(e) => setType(e.target.value as 'REAL' | 'FICTIONAL')}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>性別</Label>
          <div className="flex gap-2">
            {['牡', '牝', 'セン'].map((g) => (
              <label
                key={g}
                className={`flex flex-1 cursor-pointer items-center justify-center rounded-md border px-2 py-2 text-sm font-medium transition-all ${
                  gender === g
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={gender === g}
                  onChange={(e) => setGender(e.target.value as '牡' | '牝' | 'セン')}
                  className="sr-only"
                />
                {g === 'セン' ? 'セ' : g}
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label>
            年齢 <span className="font-normal text-gray-400">(任意)</span>
          </Label>
          <Input name="age" type="number" min="2" max="20" defaultValue={initialData?.age ?? ''} placeholder="例: 4" />
        </div>
      </div>

      <div>
        <Label>産地</Label>
        <Select name="origin" required defaultValue={initialData?.origin || 'DOMESTIC'}>
          <option value="DOMESTIC">日本産</option>
          <option value="FOREIGN_BRED">外国産</option>
          <option value="FOREIGN_TRAINED">外来馬</option>
        </Select>
      </div>

      <div>
        <Label className="mb-2 block">
          タグ <span className="font-normal text-gray-400">(任意)</span>
        </Label>
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
          {(['LEG_TYPE', 'CHARACTERISTIC', 'BIOGRAPHY', 'OTHER'] as const).map((cat) => {
            const masterTags = categorizedMasterTags[cat];
            if (!masterTags || masterTags.length === 0) return null;

            return (
              <div key={cat} className="space-y-2">
                <div className="text-sm font-semibold text-gray-500">{HORSE_TAG_CATEGORIES[cat]}</div>
                <div className="flex flex-wrap gap-2">
                  {masterTags.map((masterTag) => {
                    const isActive = tags.some((t) => t.type === masterTag.type && t.content === masterTag.content);
                    return (
                      <button
                        key={`${masterTag.type}-${masterTag.content}`}
                        type="button"
                        onClick={() => toggleTag(masterTag)}
                        className={cn(
                          'rounded-md border px-2.5 py-1 text-sm font-medium transition-all select-none',
                          isActive
                            ? 'border-primary bg-primary text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        {masterTag.content}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {tags.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-sm font-semibold text-gray-500">選択中のタグ</div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm shadow-sm ring-1 ring-gray-200"
                >
                  <span className="mr-1 text-sm font-semibold text-gray-500">
                    {HORSE_TAG_CATEGORIES[tag.type as HorseTagType] || tag.type}:
                  </span>
                  <span className="text-gray-700">{tag.content}</span>
                  <button
                    type="button"
                    onClick={() =>
                      toggleTag({
                        type: tag.type as HorseTagType,
                        content: tag.content,
                      })
                    }
                    className="ml-1 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <Label>
          備考 <span className="font-normal text-gray-400">(任意)</span>
        </Label>
        <Textarea
          name="notes"
          rows={3}
          defaultValue={initialData?.notes ?? ''}
          placeholder="馬の特徴や評価など"
          className="resize-none"
        />
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
