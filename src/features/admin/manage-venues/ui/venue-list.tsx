import { DIRECTION_LABELS } from '@/shared/constants/race';
import Link from 'next/link';
import { getVenues } from '../actions';
import { DeleteVenueButton } from './delete-venue-button';

export async function VenueList() {
  const venues = await getVenues();

  if (venues.length === 0) {
    return <div className="py-12 text-center text-gray-500">登録されている会場はありません</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full min-w-[500px] border-collapse">
        <thead className="bg-gray-50">
          <tr className="border-b border-gray-100">
            <th className="px-6 py-4 text-left text-sm font-medium tracking-wider whitespace-nowrap text-gray-400 uppercase">
              会場名
            </th>
            <th className="px-6 py-4 text-left text-sm font-medium tracking-wider whitespace-nowrap text-gray-400 uppercase">
              コード
            </th>
            <th className="px-6 py-4 text-left text-sm font-medium tracking-wider whitespace-nowrap text-gray-400 uppercase">
              略称
            </th>
            <th className="px-6 py-4 text-left text-sm font-medium tracking-wider whitespace-nowrap text-gray-400 uppercase">
              回り
            </th>
            <th className="px-6 py-4 text-left text-sm font-medium tracking-wider whitespace-nowrap text-gray-400 uppercase">
              地域
            </th>
            <th className="w-32 px-6 py-4 text-right text-sm font-medium tracking-wider whitespace-nowrap text-gray-400 uppercase">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {venues.map((venue) => (
            <tr key={venue.id} className="transition-colors hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-semibold whitespace-nowrap text-gray-900">
                <Link
                  href={`/admin/venues/${venue.id}`}
                  className="text-primary hover:text-primary/80 transition-colors hover:underline"
                >
                  {venue.name}
                </Link>
              </td>
              <td className="px-6 py-4 font-mono text-sm whitespace-nowrap text-gray-500">{venue.code || '-'}</td>
              <td className="px-6 py-4 text-sm whitespace-nowrap">{venue.shortName}</td>
              <td className="px-6 py-4 text-sm whitespace-nowrap">
                <span
                  className={`inline-flex origin-left scale-90 items-center rounded-md px-2 py-1 text-sm font-medium ring-1 ring-inset ${
                    venue.defaultDirection === 'LEFT'
                      ? 'bg-orange-50 text-orange-700 ring-orange-700/10'
                      : venue.defaultDirection === 'RIGHT'
                        ? 'bg-green-50 text-green-700 ring-green-700/10'
                        : 'bg-gray-50 text-gray-700 ring-gray-700/10'
                  }`}
                >
                  {DIRECTION_LABELS[venue.defaultDirection] || venue.defaultDirection}
                </span>
              </td>
              <td className="px-6 py-4 text-sm whitespace-nowrap">
                <span
                  className={`inline-flex origin-left scale-90 items-center rounded-md px-2 py-1 text-sm font-medium ring-1 ring-inset ${
                    venue.area === 'EAST_JAPAN'
                      ? 'bg-blue-50 text-blue-700 ring-blue-700/10'
                      : venue.area === 'WEST_JAPAN'
                        ? 'bg-red-50 text-red-700 ring-red-700/10'
                        : 'bg-purple-50 text-purple-700 ring-purple-700/10'
                  }`}
                >
                  {venue.area === 'EAST_JAPAN' ? '東日本' : venue.area === 'WEST_JAPAN' ? '西日本' : '海外'}
                </span>
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className="flex justify-end">
                  <DeleteVenueButton venueId={venue.id} venueName={venue.name} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
