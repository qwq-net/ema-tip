import type { ForecastWithUser } from '@/features/forecasts/types';
import { BracketBadge } from '@/shared/ui/bracket-badge';
import { cn } from '@/shared/utils/cn';
import { User } from 'lucide-react';
import Image from 'next/image';

/** 予想者のアイコン画像を丸抜きで表示する。画像がない場合は人型アイコンで代替する。 */
function UserAvatar({
  src,
  alt,
  className,
  iconClassName,
}: {
  src: string | null;
  alt: string;
  className: string;
  iconClassName: string;
}) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100',
        className
      )}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes="32px" className="object-cover" />
      ) : (
        <User className={iconClassName} />
      )}
    </div>
  );
}

interface ForecastDisplayProps {
  forecasts: ForecastWithUser[];
  entries: {
    horseId: string;
    horseNumber: number | null;
    horseName: string;
    bracketNumber: number | null;
  }[];
}

export function ForecastDisplay({ forecasts, entries }: ForecastDisplayProps) {
  if (forecasts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-control mt-8 space-y-4 border border-gray-200 bg-white p-6">
      <h3 className="text-text-main border-b border-gray-200 pb-2 text-lg font-semibold">予想・見解</h3>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="text-text-sub w-12 px-3 py-2 text-center text-sm">枠</th>
              <th className="text-text-sub w-12 px-3 py-2 text-center text-sm">番</th>
              <th className="text-text-sub min-w-[150px] px-3 py-2 text-left text-sm">馬名</th>
              {forecasts.map((forecast) => (
                <th key={forecast.id} className="min-w-[80px] px-3 py-2 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <UserAvatar
                      src={forecast.user.image}
                      alt={forecast.user.name || ''}
                      className="h-8 w-8"
                      iconClassName="h-4 w-4"
                    />
                    <span className="max-w-[80px] truncate text-sm font-semibold text-gray-700">
                      {forecast.user.name}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr key={entry.horseId}>
                <td className="text-text-sub px-3 py-2 text-center text-sm">
                  <BracketBadge bracketNumber={entry.bracketNumber} />
                </td>
                <td className="text-text-main px-3 py-2 text-center text-sm font-semibold">{entry.horseNumber}</td>
                <td className="text-text-main px-3 py-2 text-sm font-semibold">{entry.horseName}</td>
                {forecasts.map((forecast) => {
                  const selections = forecast.selections;
                  const symbol = selections[entry.horseId];
                  return (
                    <td key={forecast.id} className="text-text-main px-3 py-2 text-center text-base font-semibold">
                      <span
                        className={cn(
                          symbol === '◎' && 'text-red-600',
                          symbol === '◯' && 'text-blue-600',
                          symbol === '▲' && 'text-green-600',
                          (symbol === '△' || symbol === '☆') && 'text-gray-700'
                        )}
                      >
                        {symbol}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {forecasts.map(
          (forecast) =>
            forecast.comment && (
              <div key={forecast.id} className="rounded-control bg-gray-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <UserAvatar
                    src={forecast.user.image}
                    alt={forecast.user.name || ''}
                    className="h-6 w-6"
                    iconClassName="h-3 w-3"
                  />
                  <span className="text-text-main text-sm font-semibold">{forecast.user.name}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap text-gray-700">{forecast.comment}</p>
              </div>
            )
        )}
      </div>
    </div>
  );
}
