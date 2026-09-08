'use client';

import { upsertForecast } from '@/features/forecasts/actions';

import { FORECAST_SYMBOLS } from '@/features/forecasts/constants';
import type { ForecastSelection } from '@/features/forecasts/types';
import { toast } from '@/shared/lib/toast';
import { Button, EmptyState, TableBody, TableHead, TableRow, Td, Textarea, Th } from '@/shared/ui';
import { Badge } from '@/shared/ui/badge';
import { BracketBadge } from '@/shared/ui/bracket-badge';
import { cn } from '@/shared/utils/cn';
import { getGenderAge } from '@/shared/utils/gender';
import { Info, Loader2, Save } from 'lucide-react';
import { useState, useTransition } from 'react';

interface ForecastEntry {
  id: string;
  horseId: string;
  horseNumber: number | null;
  horseName: string;
  horseGender: string;
  horseAge: number;
  bracketNumber: number | null;
}

interface ForecastInputFormProps {
  raceId: string;
  entries: ForecastEntry[];
  initialForecast?:
    | {
        selections: ForecastSelection;
        comment: string | null;
      }
    | null
    | undefined;
}

/**
 * 1 頭分の印ボタンの並び。狭い幅のリストと表の両方から同じ並びを呼ぶ。
 * 選択中の印をもう一度押すと解除されるため、押下は onSelect 側で判定する。
 */
function SymbolButtons({
  entry,
  selected,
  onSelect,
}: {
  entry: ForecastEntry;
  selected: string | undefined;
  onSelect: (horseId: string, symbol: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {FORECAST_SYMBOLS.map((symbol) => (
        <button
          key={symbol}
          type="button"
          aria-pressed={selected === symbol}
          aria-label={`${entry.horseName} に ${symbol}`}
          onClick={() => onSelect(entry.horseId, symbol)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
            selected === symbol
              ? 'border-primary bg-primary text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          )}
        >
          {symbol}
        </button>
      ))}
    </div>
  );
}

export function ForecastInputForm({ raceId, entries, initialForecast }: ForecastInputFormProps) {
  const [selections, setSelections] = useState<ForecastSelection>(initialForecast?.selections ?? {});
  const [comment, setComment] = useState(initialForecast?.comment || '');
  const [isPending, startTransition] = useTransition();

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Info}
        title="出走馬が登録されていません"
        description="予想を入力するには、まず出走馬を登録してください。"
      />
    );
  }

  const handleSymbolSelect = (horseId: string, symbol: string) => {
    setSelections((prev) => {
      // 同じ印をもう一度押したら選択解除
      if (prev[horseId] === symbol) {
        return Object.fromEntries(Object.entries(prev).filter(([id]) => id !== horseId));
      }
      return { ...prev, [horseId]: symbol };
    });
  };

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        await upsertForecast(raceId, selections, comment);
        toast.success('予想を保存しました');
      } catch (error) {
        console.error(error);
        toast.error('保存に失敗しました');
      }
    });
  };

  return (
    <div className="rounded-surface space-y-6 border border-gray-100 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-text-main text-lg font-semibold">予想入力</h2>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          保存する
        </Button>
      </div>

      <ul className="divide-y divide-gray-100 sm:hidden">
        {entries.map((entry) => (
          <li key={entry.id} className="space-y-2 py-3">
            <div className="flex items-center gap-2">
              <BracketBadge bracketNumber={entry.bracketNumber} />
              <span className="text-text-main font-semibold">
                {entry.horseNumber} {entry.horseName}
              </span>
              <Badge variant="gender" label={getGenderAge(entry.horseGender, entry.horseAge)} />
            </div>
            <SymbolButtons entry={entry} selected={selections[entry.horseId]} onSelect={handleSymbolSelect} />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[600px] border-collapse">
          <TableHead>
            <Th>枠</Th>
            <Th>馬番</Th>
            <Th>馬名</Th>
            <Th>性齢</Th>
            <Th>印</Th>
          </TableHead>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <Td>
                  <BracketBadge bracketNumber={entry.bracketNumber} />
                </Td>
                <Td className="text-text-main">{entry.horseNumber}</Td>
                <Td className="text-text-main font-semibold">{entry.horseName}</Td>
                <Td>
                  <Badge variant="gender" label={getGenderAge(entry.horseGender, entry.horseAge)} />
                </Td>
                <Td className="whitespace-normal">
                  <SymbolButtons entry={entry} selected={selections[entry.horseId]} onSelect={handleSymbolSelect} />
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>

      <div className="space-y-2">
        <label htmlFor="comment" className="block text-sm text-gray-700">
          短評・コメント
        </label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="レースの見解や推奨理由などを入力してください"
          className="w-full"
        />
      </div>
    </div>
  );
}
