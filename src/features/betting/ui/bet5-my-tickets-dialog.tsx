'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui';
import { getBracketColor } from '@/shared/utils/bracket';
import { Ticket } from 'lucide-react';

interface RaceWithEntries {
  id: string;
  raceNumber: number | null;
  name: string;
  entries: {
    id: string;
    horseNumber: number | null;
    bracketNumber: number | null;
    horse: {
      id: string;
      name: string;
    };
  }[];
}

interface Bet5Ticket {
  id: string;
  amount: number;
  race1HorseIds: string[];
  race2HorseIds: string[];
  race3HorseIds: string[];
  race4HorseIds: string[];
  race5HorseIds: string[];
}

interface Bet5MyTicketsDialogProps {
  tickets: Bet5Ticket[];
  races: RaceWithEntries[];
}

/**
 * 自分が購入済みのBET5チケット一覧を表示するボタン付きモーダル。
 * races は bet5Event の第1〜5戦の定義順で渡すこと。チケットの raceN 選択と突き合わせて表示する。
 */
export function Bet5MyTicketsDialog({ tickets, races }: Bet5MyTicketsDialogProps) {
  if (tickets.length === 0) return null;

  const getTicketSelections = (ticket: Bet5Ticket) => [
    ticket.race1HorseIds,
    ticket.race2HorseIds,
    ticket.race3HorseIds,
    ticket.race4HorseIds,
    ticket.race5HorseIds,
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Ticket className="mr-2 h-4 w-4" />
          購入済みの投票を確認
          <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-100 px-1.5 text-sm font-semibold text-indigo-700">
            {tickets.length}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>購入済みのBET5投票</DialogTitle>
          <DialogDescription>このイベントであなたが購入したBET5チケットの一覧です。</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {tickets.map((ticket, ticketIndex) => {
            const selectionsByRace = getTicketSelections(ticket);
            const points = selectionsByRace.reduce((total, horseIds) => total * horseIds.length, 1);

            return (
              <div key={ticket.id} className="space-y-3 rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-500">チケット {ticketIndex + 1}</p>
                {races.map((race, raceIndex) => {
                  const horseIds = selectionsByRace[raceIndex] || [];
                  const selectedHorses = race.entries
                    .filter((entry) => horseIds.includes(entry.horse.id))
                    .sort((a, b) => (a.horseNumber || 0) - (b.horseNumber || 0));

                  return (
                    <div key={race.id} className="flex flex-col gap-1 border-b border-gray-100 pb-2 last:border-0">
                      <div className="text-sm font-semibold text-gray-600">
                        {race.raceNumber}R {race.name}
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-2">
                        {selectedHorses.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-sm"
                          >
                            <span
                              className={`inline-flex h-4 w-4 items-center justify-center rounded text-sm font-semibold shadow-sm ${getBracketColor(entry.bracketNumber || 0)}`}
                            >
                              {entry.bracketNumber || '-'}
                            </span>
                            <span className="font-mono font-semibold text-gray-900">{entry.horseNumber}</span>
                            <span className="text-sm text-gray-600">{entry.horse.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span className="text-gray-500">{points}点</span>
                  <span className="font-semibold text-indigo-600">{ticket.amount.toLocaleString('ja-JP')}円</span>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
