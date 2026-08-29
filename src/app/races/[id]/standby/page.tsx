import { BetDetail, BetType } from '@/entities/bet';
import { getPayoutResults } from '@/entities/race/actions';
import { getEntriesForRace, getRaceById } from '@/features/admin/manage-entries/actions';
import { getUserBetGroupsForRace } from '@/features/betting/actions';
import { PurchasedTicketList } from '@/features/betting/ui/purchased-ticket-list';
import { RankingButton } from '@/features/ranking/components/ranking-button';
import { requireLoginPage } from '@/shared/utils/admin';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StandbyClient } from './standby-client';

interface Entry {
  id: string;
  horseId: string;
  bracketNumber: number | null;
  horseNumber: number | null;
  horseName: string;
  horseGender: string;
  horseAge: number | null;
  finishPosition: number | null;
}

interface ClientPayoutResult {
  type: BetType;
  combinations: {
    numbers: number[];
    payout: number;
    popularity?: number;
  }[];
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '結果待機',
};

export default async function RaceStandbyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireLoginPage();

  const [race, entriesData, betGroupsData] = await Promise.all([
    getRaceById(id),
    getEntriesForRace(id),
    getUserBetGroupsForRace(id),
  ]);
  const entries: Entry[] = entriesData;

  if (!race) {
    notFound();
  }

  const isFinalized = race.status === 'FINALIZED';

  let initialResults: ClientPayoutResult[] = [];
  if (isFinalized) {
    const rawResults = await getPayoutResults(id);
    initialResults = rawResults.map((r) => ({
      type: r.type,
      combinations: r.combinations,
    }));
  }

  const ticketGroups = betGroupsData.map((group) => {
    return {
      id: group.id,
      type: group.type as BetType,
      totalAmount: group.totalAmount,
      createdAt: group.createdAt,
      bets: group.bets.map((bet) => {
        const details = bet.details as BetDetail;
        return {
          id: bet.id,
          type: details.type,
          amount: bet.amount,
          status: bet.status,
          payout: bet.payout ?? undefined,
          odds: bet.odds ?? undefined,
          createdAt: bet.createdAt,
          selections: details.selections.map((num: number) => {
            const entry = entries.find((e: Entry) => e.horseNumber === num);
            return {
              horseNumber: num,
              bracketNumber: entry?.bracketNumber || undefined,
              horseName: entry?.horseName || '不明',
              horseGender: entry?.horseGender || '不明',
              horseAge: entry?.horseAge || 0,
            };
          }),
        };
      }),
    };
  });

  const initialRanking = entries
    .filter((e) => e.finishPosition !== null)
    .sort((a, b) => (a.finishPosition || 0) - (b.finishPosition || 0))
    .slice(0, 5)
    .map((e) => ({
      finishPosition: e.finishPosition!,
      horseNumber: e.horseNumber!,
      bracketNumber: e.bracketNumber!,
      horseName: e.horseName,
    }));

  return (
    <div className="flex flex-col items-center p-4 lg:p-8">
      <div className="w-full max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href={`/races/${id}`}
            className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft size={16} />
            レース画面へ戻る
          </Link>
          <RankingButton eventId={race.eventId} />
        </div>

        <StandbyClient
          race={{
            ...race,
            location: race.venue?.shortName ?? '',
            closingAt: race.closingAt,
            status: race.status,
          }}
          isFinalized={isFinalized}
          initialResults={initialResults}
          initialRanking={initialRanking}
          hasTickets={ticketGroups.length > 0}
          entryCount={entries.length}
        />

        <PurchasedTicketList ticketGroups={ticketGroups} fixedOddsMode={race.fixedOddsMode} />
      </div>
    </div>
  );
}
