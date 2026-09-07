import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * レース詳細系ページ共通のヘッダ。会場略称・レース番号・所属イベント名・レース名・Netkeibaリンクと、
 * 馬場・距離・頭数のメタ行を表示する。投票画面と管理詳細で同一の情報構成を保つための部品。
 * entrantCount は出走中の頭数を渡す前提。取消・除外馬は呼び手側で除外する。
 * 開催日は表示しない。操作時点がレース当日である運用前提のため。
 * eventHref を渡すとイベント名が親イベントへのリンクになる。管理画面の親子導線用で、投票画面は渡さない。
 * actions は右側に並べる画面固有の操作ボタン群。
 */
export function RacePageHeader({
  venueShortName,
  raceNumber,
  eventName,
  eventHref,
  name,
  netkeibaUrl,
  surface,
  distance,
  entrantCount,
  actions,
}: {
  venueShortName?: string | null;
  raceNumber: number | null;
  eventName?: string | null;
  eventHref?: string;
  name: string;
  netkeibaUrl?: string | null;
  surface: string;
  distance: number;
  entrantCount: number;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {venueShortName && <span className="text-text-sub text-sm">{venueShortName}</span>}
        {raceNumber && (
          <span className="rounded-chip flex h-5 w-7 items-center justify-center bg-gray-100 text-sm font-semibold text-gray-600">
            {raceNumber}R
          </span>
        )}
        {eventName && (
          <>
            <span className="text-gray-300">/</span>
            {eventHref ? (
              <Link href={eventHref} className="text-text-sub hover:text-text-main truncate text-sm hover:underline">
                {eventName}
              </Link>
            ) : (
              <span className="text-text-sub truncate text-sm">{eventName}</span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-text-main text-3xl font-semibold">{name}</h1>
          {netkeibaUrl && (
            <a
              href={netkeibaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-control inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100"
            >
              <ExternalLink className="h-3 w-3" />
              Netkeiba
            </a>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="text-text-sub flex items-center gap-3 text-sm">
        <span>{surface}</span>
        <span className="h-1 w-1 rounded-full bg-gray-300" />
        <span>{distance}m</span>
        <span className="h-1 w-1 rounded-full bg-gray-300" />
        <span>{entrantCount}頭</span>
      </div>
    </div>
  );
}
