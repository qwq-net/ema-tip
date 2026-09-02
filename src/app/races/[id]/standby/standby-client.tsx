'use client';

import { getDisplayStatus } from '@/entities/race/lib/status';
import { useRaceEvents } from '@/features/betting/lib/hooks/use-race-events';
import { PayoutResult, useRaceResults } from '@/features/betting/lib/hooks/use-race-results';
import { PayoutResultModal } from '@/features/betting/ui/payout-result-modal';
import { RACE_STATUS_LABELS, RaceStatus } from '@/shared/constants/status';
import type { RaceResultItem } from '@/shared/lib/sse/types';
import { Badge, Button, LiveConnectionStatus } from '@/shared/ui';
import { getBracketColor } from '@/shared/utils/bracket';
import { lookup } from '@/shared/utils/lookup';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useState } from 'react';

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
  hasTickets?: boolean;
  entryCount: number;
}

export function StandbyClient({
  race,
  initialResults = [],
  initialRanking = [],
  isFinalized: initialIsFinalized,
  hasTickets,
  entryCount,
}: StandbyClientProps) {
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
        .catch((e) => {
          console.error('Failed to unlock audio:', e);
          setIsAudioEnabled(true);
        });
    } else {
      setIsAudioEnabled(false);
    }
  }, [isAudioEnabled]);

  const handleRaceBroadcast = useCallback(async () => {
    if (isAudioEnabled) {
      try {
        const audio = new Audio('/sounds/chime.mp3');
        audio.volume = 0.35;
        audio.play().catch((e) => console.error('Audio play error:', e));
      } catch (error) {
        console.error('Failed to play notification sound:', error);
      }
    }

    await fetchResults();
    setShowModal(true);
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

  const baseStatus: RaceStatus = initialIsFinalized ? 'FINALIZED' : isClosed ? 'CLOSED' : 'SCHEDULED';
  const displayStatus = initialIsFinalized ? 'FINALIZED' : getDisplayStatus(baseStatus, ranking.length > 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-green-600';
      case 'CLOSED':
        return 'bg-orange-600';
      case 'RANKING_CONFIRMED':
        return 'bg-indigo-500 ring-indigo-300';
      case 'FINALIZED':
        return 'bg-indigo-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-amber-100 text-amber-700 ring-amber-200';
      case 2:
        return 'bg-slate-100 text-slate-700 ring-slate-200';
      case 3:
        return 'bg-orange-100 text-orange-700 ring-orange-200';
      default:
        return 'bg-gray-100 text-gray-600 ring-gray-200';
    }
  };

  return (
    <>
      <div className="mb-8 flex items-center justify-between border-b border-gray-100 pb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className={`rounded px-2 py-0.5 text-sm font-semibold text-white ${getStatusColor(displayStatus)}`}>
              {lookup(RACE_STATUS_LABELS, displayStatus) || RACE_STATUS_LABELS[baseStatus]}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-500">{race.location}</span>
              {race.raceNumber && (
                <span className="flex h-5 w-7 items-center justify-center rounded bg-gray-100 text-sm font-semibold text-gray-600">
                  {race.raceNumber}R
                </span>
              )}
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">{race.name}</h1>
            <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
              <span>{race.surface}</span>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span>{race.distance}m</span>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span>{entryCount}頭</span>
            </div>
          </div>
        </div>

        {initialIsFinalized && hasTickets && (
          <Button onClick={() => setShowModal(true)} variant="primary" className="px-6 font-semibold">
            払戻結果を確認
          </Button>
        )}
      </div>

      {ranking.length > 0 && (
        <div className="mb-8 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
                R
              </span>
              <h3 className="text-sm font-semibold text-gray-900">{initialIsFinalized ? '確定着順' : '着順速報'}</h3>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {ranking.map((result) => (
              <div key={result.horseNumber} className="flex items-center px-6 py-3">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-sm font-semibold ring-1 ring-inset ${getRankColor(
                    result.finishPosition
                  )}`}
                >
                  {result.finishPosition}
                </div>
                <div className="ml-4 flex items-center gap-3">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded text-sm font-semibold shadow-xs ${getBracketColor(
                      result.bracketNumber
                    )}`}
                  >
                    {result.horseNumber}
                  </div>
                  <span className="font-medium text-gray-900">{result.horseName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!initialIsFinalized && !hasTickets && (
        <div className="mb-8 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div
            className={`border-b border-gray-100 px-6 py-4 ${
              isClosed ? 'bg-linear-to-r from-gray-50 to-white' : 'bg-linear-to-r from-blue-50 to-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {isClosed ? (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-400 text-sm font-semibold text-white">
                  !
                </div>
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              )}
              <span className={`text-sm font-semibold ${isClosed ? 'text-gray-600' : 'text-blue-600'}`}>
                {isClosed ? '投票締切' : '確定待ち'}
              </span>
            </div>
          </div>
          <div className="p-6">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              {isClosed ? 'レースは締め切られました' : 'レースの確定を待っています'}
            </h2>
            <p className="text-sm leading-relaxed text-gray-600">
              {isClosed
                ? '結果発表をお待ちください。確定後に結果（払戻金等）の確認が可能です。'
                : '購入した馬券はありませんが、発表されるまでこの画面のままお待ちください。確定後に結果（払戻金等）の確認が可能です。'}
            </p>
          </div>
        </div>
      )}

      {initialIsFinalized && !hasTickets && (
        <div className="mb-8 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-linear-to-r from-gray-50 to-white px-6 py-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Badge variant="status" label="情報" className="bg-gray-100 text-gray-600" />
              <span className="text-sm font-semibold">結果発表済み</span>
            </div>
          </div>
          <div className="p-6">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">このレースの結果が発表されました</h2>
            <p className="text-sm leading-relaxed text-gray-600">
              購入した馬券はありませんが、下のボタンから払戻結果のなどの詳細情報を確認いただけます。
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => setShowModal(true)}
                variant="primary"
                className="w-full px-8 font-semibold sm:w-auto"
              >
                払戻結果を確認する
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 確定済みで SSE を張っていないときは、接続状態も音声通知も意味を持たないため丸ごと出さない */}
      {connectionStatus !== 'DISABLED' && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <button
            onClick={toggleAudio}
            className={`flex h-8 w-8 items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-all ${
              isAudioEnabled
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-800/80 text-gray-400 hover:text-white'
            }`}
            aria-label={isAudioEnabled ? '音声通知をOFFにする' : '音声通知をONにする'}
          >
            {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <div className="flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 shadow-lg backdrop-blur-sm">
            <LiveConnectionStatus status={connectionStatus} showText={true} className="text-white" />
          </div>
        </div>
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
