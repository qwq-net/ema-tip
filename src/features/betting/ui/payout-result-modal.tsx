'use client';

import { BET_TYPES, BetType } from '@/entities/bet';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui';
import { X } from 'lucide-react';

interface ResultItem {
  type: BetType;
  combinations: {
    numbers: number[];
    payout: number;
    popularity?: number;
    guaranteed?: boolean;
  }[];
}

interface PayoutResultModalProps {
  raceName: string;
  raceDate: string;
  results: ResultItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_COLORS = {
  [BET_TYPES.WIN]: 'bg-blue-800 text-white',
  [BET_TYPES.PLACE]: 'bg-red-600 text-white',
  [BET_TYPES.BRACKET_QUINELLA]: 'bg-green-700 text-white',
  [BET_TYPES.QUINELLA]: 'bg-purple-800 text-white',
  [BET_TYPES.WIDE]: 'bg-cyan-600 text-white',
  [BET_TYPES.EXACTA]: 'bg-yellow-500 text-black',
  [BET_TYPES.TRIO]: 'bg-blue-600 text-white',
  [BET_TYPES.TRIFECTA]: 'bg-amber-700 text-white',
} satisfies Record<BetType, string>;

const TYPE_LABELS = {
  [BET_TYPES.WIN]: '単 勝',
  [BET_TYPES.PLACE]: '複 勝',
  [BET_TYPES.BRACKET_QUINELLA]: '枠 連',
  [BET_TYPES.QUINELLA]: '馬 連',
  [BET_TYPES.WIDE]: 'ワイド',
  [BET_TYPES.EXACTA]: '馬 単',
  [BET_TYPES.TRIO]: '3連複',
  [BET_TYPES.TRIFECTA]: '3連単',
} satisfies Record<BetType, string>;

export function PayoutResultModal({ raceName, raceDate, results, open, onOpenChange }: PayoutResultModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-0 border-gray-700 bg-black p-0 shadow-2xl">
        <div className="flex items-center justify-between bg-linear-to-b from-blue-900 to-blue-950 px-6 py-3 text-white">
          <div className="flex items-end gap-4">
            <DialogTitle asChild>
              <div className="flex items-end gap-4">
                <span className="text-xl font-semibold tracking-widest">{raceDate}</span>
                <span className="text-2xl font-semibold">{raceName}</span>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">{raceName}の払戻金結果を表示しています。</DialogDescription>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xl font-semibold tracking-widest">払戻金</span>
            <DialogClose asChild>
              <button className="text-gray-400 hover:text-white">
                <X size={28} />
              </button>
            </DialogClose>
          </div>
        </div>

        <div className="flex flex-col gap-px bg-gray-700 p-px">
          <div className="grid grid-cols-1 gap-px md:grid-cols-2">
            {renderResultBlock(results, BET_TYPES.WIN)}
            {renderResultBlock(results, BET_TYPES.BRACKET_QUINELLA)}
          </div>

          <div className="grid grid-cols-1 gap-px md:grid-cols-2">
            {renderResultBlock(results, BET_TYPES.PLACE, 3)}
            {renderResultBlock(results, BET_TYPES.WIDE, 3)}
          </div>

          <div className="flex flex-col gap-px">
            {renderResultBlock(results, BET_TYPES.QUINELLA, 1, true)}
            {renderResultBlock(results, BET_TYPES.EXACTA, 1, true)}
            {renderResultBlock(results, BET_TYPES.TRIO, 1, true)}
            {renderResultBlock(results, BET_TYPES.TRIFECTA, 1, true)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function renderResultBlock(results: ResultItem[], type: BetType, minRows: number = 1, fullWidth: boolean = false) {
  const item = results.find((r) => r.type === type);
  const data = item?.combinations || [];

  const rows: ResultItem['combinations'] = [...data];
  while (rows.length < minRows) {
    rows.push({ numbers: [], payout: 0 });
  }

  return (
    <div className={`flex min-h-12 bg-black text-white ${fullWidth ? 'w-full' : ''}`}>
      {}
      <div
        className={`flex w-24 shrink-0 items-center justify-center text-lg font-semibold tracking-widest ${TYPE_COLORS[type]} border-r border-gray-700`}
      >
        <span className="text-center leading-tight whitespace-pre-line">{TYPE_LABELS[type]}</span>
      </div>

      {}
      <div className="flex flex-1 flex-col">
        {rows.map((row, idx) => {
          const isPlaceholder = row.numbers.length === 0;
          return (
            <div
              key={idx}
              className="flex min-h-12 flex-1 items-center justify-between border-b border-gray-800 px-4 py-2 last:border-0"
            >
              <div className="font-mono text-2xl font-semibold tracking-wider">
                {isPlaceholder ? '-' : row.numbers.join(' - ')}
              </div>
              <div className="flex min-w-32 items-center justify-end gap-2">
                {row.guaranteed && (
                  <span className="rounded bg-emerald-900 px-1.5 py-0.5 text-sm font-semibold text-emerald-300">
                    保証
                  </span>
                )}
                <span className="text-right font-mono text-xl font-semibold">
                  {row.payout.toLocaleString('ja-JP')}円
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
