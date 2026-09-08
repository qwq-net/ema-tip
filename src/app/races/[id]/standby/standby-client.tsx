'use client';

import { getDisplayStatus } from '@/entities/race/lib/status';
import { RaceMetaRow } from '@/entities/race/ui/race-meta-row';
import { RaceNumberChip } from '@/entities/race/ui/race-number-chip';
import { useRaceEvents } from '@/features/betting/lib/hooks/use-race-events';
import type { PayoutResult } from '@/features/betting/lib/hooks/use-race-results';
import { useRaceResults } from '@/features/betting/lib/hooks/use-race-results';
import { PayoutResultModal } from '@/features/betting/ui/payout-result-modal';
import { PurchasedTicketList } from '@/features/betting/ui/purchased-ticket-list';
import { medalRankClass } from '@/shared/constants/rank-medal';
import type { RaceStatus } from '@/shared/constants/status';
import type { ConnectionStatus } from '@/shared/hooks/use-sse';
import type { RaceResultItem } from '@/shared/lib/sse/types';
import { Badge, Button, LiveStatusPill } from '@/shared/ui';
import { getBracketColor } from '@/shared/utils/bracket';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import { type ComponentProps, useCallback, useState } from 'react';

/** 待機画面の土台となるレース状態を返す。払戻確定が最優先で、次に締切、どちらでもなければ出走前。 */
function toBaseStatus(isFinalized: boolean, isClosed: boolean): RaceStatus {
  if (isFinalized) return 'FINALIZED';
  return isClosed ? 'CLOSED' : 'SCHEDULED';
}

interface RankingCardProps {
  ranking: RaceResultItem[];
  isFinalized: boolean;
}

/** 着順の一覧カード。払戻確定前は速報、確定後は確定着順として見出しを出し分ける。 */
function RankingCard({ ranking, isFinalized }: RankingCardProps) {
  return (
    <div className="rounded-surface mb-8 overflow-hidden border border-gray-100 bg-white">
      <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
            R
          </span>
          <h3 className="text-text-main text-sm font-semibold">{isFinalized ? '確定着順' : '着順速報'}</h3>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {ranking.map((result) => (
          <div key={result.horseNumber} className="flex items-center px-6 py-3">
            <div
              className={`rounded-chip flex h-6 w-6 shrink-0 items-center justify-center text-sm font-semibold ${
                medalRankClass(result.finishPosition) ?? 'text-text-sub bg-gray-100'
              }`}
            >
              {result.finishPosition}
            </div>
            <div className="ml-4 flex items-center gap-3">
              <div
                className={`rounded-chip flex h-6 w-6 items-center justify-center text-sm font-semibold ${getBracketColor(
                  result.bracketNumber
                )}`}
              >
                {result.horseNumber}
              </div>
              <span className="text-text-main font-semibold">{result.horseName}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 馬券を持たない利用者向けの待機案内。締切前と締切後で見出しと文面を切り替える。 */
function WaitingNotice({ isClosed }: { isClosed: boolean }) {
  return (
    <div className="rounded-surface mb-8 overflow-hidden border border-gray-100 bg-white">
      <div className={`border-b border-gray-100 px-6 py-4 ${isClosed ? 'bg-gray-50' : 'bg-turf-50'}`}>
        <div className="flex items-center gap-2">
          {isClosed ? (
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-400 text-sm font-semibold text-white">
              !
            </div>
          ) : (
            <Loader2 className="text-turf-600 h-4 w-4 animate-spin" />
          )}
          <span className={`text-sm font-semibold ${isClosed ? 'text-gray-600' : 'text-turf-700'}`}>
            {isClosed ? '投票締切' : '確定待ち'}
          </span>
        </div>
      </div>
      <div className="p-6">
        <h2 className="text-text-main mb-2 text-lg font-semibold">
          {isClosed ? 'レースは締め切られました' : 'レースの確定を待っています'}
        </h2>
        <p className="text-sm leading-relaxed text-gray-600">
          {isClosed
            ? '結果発表をお待ちください。確定後に結果（払戻金等）の確認が可能です。'
            : '購入した馬券はありませんが、発表されるまでこの画面のままお待ちください。確定後に結果（払戻金等）の確認が可能です。'}
        </p>
      </div>
    </div>
  );
}

interface LiveStatusBarProps {
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
  connectionStatus: ConnectionStatus;
}

/** 画面右上に固定する音声通知の切り替えと SSE 接続状態の表示。ヘッダーの 64px を避けて下に置く。 */
function LiveStatusBar({ isAudioEnabled, onToggleAudio, connectionStatus }: LiveStatusBarProps) {
  return (
    <div className="fixed top-20 right-4 z-40 flex items-center gap-2">
      <button
        onClick={onToggleAudio}
        className={`flex h-8 w-8 items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition ${
          isAudioEnabled ? 'bg-turf-600 hover:bg-turf-700 text-white' : 'bg-gray-800/80 text-gray-400 hover:text-white'
        }`}
        aria-label={isAudioEnabled ? '音声通知をOFFにする' : '音声通知をONにする'}
      >
        {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>
      <LiveStatusPill status={connectionStatus} />
    </div>
  );
}

interface StandbyClientProps {
  race: {
    id: string;
    name: string;
    location: string;
    date: string;
    closingAt: Date | null;
    raceNumber?: number | null;
    surface: string;
    distance: number;
    status: string;
  };
  initialResults?: PayoutResult[];
  initialRanking?: { finishPosition: number; horseNumber: number; bracketNumber: number; horseName: string }[];
  isFinalized: boolean;
  ticketGroups: ComponentProps<typeof PurchasedTicketList>['ticketGroups'];
  fixedOddsMode: boolean;
  entryCount: number;
}

export function StandbyClient({
  race,
  initialResults = [],
  initialRanking = [],
  isFinalized: initialIsFinalized,
  ticketGroups,
  fixedOddsMode,
  entryCount,
}: StandbyClientProps) {
  const hasTickets = ticketGroups.length > 0;
  const [showModal, setShowModal] = useState(false);
  const [isClosed, setIsClosed] = useState(() => {
    if (initialIsFinalized) return true;
    if (race.status === 'CLOSED') return true;
    if (!race.closingAt) return false;
    return new Date(race.closingAt) < new Date();
  });
  const [ranking, setRanking] = useState<RaceResultItem[]>(initialRanking);

  const { results, fetchResults } = useRaceResults(race.id, initialResults, initialIsFinalized);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const toggleAudio = useCallback(() => {
    if (!isAudioEnabled) {
      const audio = new Audio('/sounds/chime.mp3');
      audio.volume = 0;
      audio
        .play()
        .then(() => {
          setIsAudioEnabled(true);
        })
        .catch((cause: unknown) => {
          console.error('Failed to unlock audio:', cause);
          setIsAudioEnabled(true);
        });
    } else {
      setIsAudioEnabled(false);
    }
  }, [isAudioEnabled]);

  const handleRaceBroadcast = useCallback(() => {
    if (isAudioEnabled) {
      try {
        const audio = new Audio('/sounds/chime.mp3');
        audio.volume = 0.35;
        audio.play().catch((cause: unknown) => console.error('Audio play error:', cause));
      } catch (error) {
        console.error('Failed to play notification sound:', error);
      }
    }

    // 払戻結果の取得は失敗を内部で処理して解決するため、完了後にモーダルを開くだけでよい
    void fetchResults().then(() => setShowModal(true));
  }, [fetchResults, isAudioEnabled]);

  const { connectionStatus } = useRaceEvents({
    raceId: race.id,
    isFinalized: initialIsFinalized,
    onRaceBroadcast: handleRaceBroadcast,
    onRaceClosed: useCallback(() => setIsClosed(true), []),
    onRaceReopened: useCallback(() => setIsClosed(false), []),
    onRaceResultUpdated: useCallback((results: RaceResultItem[]) => {
      setRanking(results);
    }, []),
  });

  const baseStatus = toBaseStatus(initialIsFinalized, isClosed);
  const displayStatus = initialIsFinalized ? 'FINALIZED' : getDisplayStatus(baseStatus, ranking.length > 0);

  return (
    <>
      <div className="mb-8 flex items-center justify-between border-b border-gray-100 pb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="status" label={displayStatus} />
            <div className="flex items-center gap-2">
              <span className="text-text-sub text-sm">{race.location}</span>
              {race.raceNumber && <RaceNumberChip raceNumber={race.raceNumber} />}
            </div>
          </div>
          <div>
            <h1 className="text-text-main text-3xl font-semibold">{race.name}</h1>
            <RaceMetaRow surface={race.surface} distance={race.distance} entrantCount={entryCount} className="mt-2" />
          </div>
        </div>

        {initialIsFinalized && hasTickets && (
          <Button onClick={() => setShowModal(true)} variant="primary" className="px-6 font-semibold">
            払戻結果を確認
          </Button>
        )}
      </div>

      {ranking.length > 0 && <RankingCard ranking={ranking} isFinalized={initialIsFinalized} />}

      {!initialIsFinalized && !hasTickets && <WaitingNotice isClosed={isClosed} />}

      <PurchasedTicketList
        ticketGroups={ticketGroups}
        fixedOddsMode={fixedOddsMode}
        emptyDescription={initialIsFinalized ? '結果は発表済みです。払戻の内訳は確認できます。' : ''}
        emptyAction={
          initialIsFinalized ? (
            <Button onClick={() => setShowModal(true)} variant="primary" className="px-8 font-semibold">
              払戻結果を確認する
            </Button>
          ) : null
        }
      />

      {/* 確定済みで SSE を張っていないときは、接続状態も音声通知も意味を持たないため丸ごと出さない */}
      {connectionStatus !== 'DISABLED' && (
        <LiveStatusBar
          isAudioEnabled={isAudioEnabled}
          onToggleAudio={toggleAudio}
          connectionStatus={connectionStatus}
        />
      )}

      <PayoutResultModal
        open={showModal}
        onOpenChange={setShowModal}
        raceName={race.name}
        raceDate={`${race.location} ${race.date}`}
        results={results}
      />
    </>
  );
}
