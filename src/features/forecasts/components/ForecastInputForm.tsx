'use client';

import { upsertForecast } from '@/features/forecasts/actions';

import { FORECAST_SYMBOLS } from '@/features/forecasts/constants';
import { ForecastSelection } from '@/features/forecasts/types';
import { toast } from '@/shared/lib/toast';
import { Button, TableBody, TableHead, TableRow, Td, Textarea, Th } from '@/shared/ui';
import { Badge } from '@/shared/ui/badge';
import { BracketBadge } from '@/shared/ui/bracket-badge';
import { cn } from '@/shared/utils/cn';
import { getGenderAge } from '@/shared/utils/gender';
import { Info, Loader2, Save } from 'lucide-react';
import { useState, useTransition } from 'react';

interface ForecastInputFormProps {
  raceId: string;
  entries: {
    id: string;
    horseId: string;
    horseNumber: number | null;
    horseName: string;
    horseGender: string;
    horseAge: number;
    bracketNumber: number | null;
  }[];
  initialForecast?: {
    selections: ForecastSelection;
    comment: string | null;
  } | null;
}

export function ForecastInputForm({ raceId, entries, initialForecast }: ForecastInputFormProps) {
  const [selections, setSelections] = useState<ForecastSelection>(initialForecast?.selections || {});
  const [comment, setComment] = useState(initialForecast?.comment || '');
  const [isPending, startTransition] = useTransition();

  if (entries.length === 0) {
    return (
      <div className="rounded-surface border border-gray-100 bg-white p-12 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-300">
            <Info className="h-8 w-8" />
          </div>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">出走馬が登録されていません</h3>
        <p className="text-sm text-gray-500">予想を入力するには、まず出走馬の登録が必要です。</p>
      </div>
    );
  }

  const handleSymbolSelect = (horseId: string, symbol: string) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[horseId] === symbol) {
        delete next[horseId];
      } else {
        next[horseId] = symbol;
      }
      return next;
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">予想入力</h2>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          保存する
        </Button>
      </div>

      <div className="overflow-x-auto">
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
                <Td className="text-gray-900">{entry.horseNumber}</Td>
                <Td className="font-medium text-gray-900">{entry.horseName}</Td>
                <Td>
                  <Badge variant="gender" label={getGenderAge(entry.horseGender, entry.horseAge)} />
                </Td>
                <Td className="whitespace-normal">
                  <div className="flex flex-wrap gap-2">
                    {FORECAST_SYMBOLS.map((symbol) => (
                      <button
                        key={symbol}
                        onClick={() => handleSymbolSelect(entry.horseId!, symbol)}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                          selections[entry.horseId!] === symbol
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        {symbol}
                      </button>
                    ))}
                  </div>
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>

      <div className="space-y-2">
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
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
