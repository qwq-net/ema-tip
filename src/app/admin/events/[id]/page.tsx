import { getDisplayStatus } from '@/entities/race/lib/status';
import { RaceListTable } from '@/entities/race/ui/race-list-table';
import { AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { db } from '@/shared/db';
import { raceInstances } from '@/shared/db/schema';
import { Badge, Button, Card } from '@/shared/ui';
import { asc, eq } from 'drizzle-orm';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'イベントのレース',
};

/** イベント配下のレース一覧。レース名から確定画面へ、末尾列から出走馬タブへ移動できる。 */
export default async function EventRacesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const races = await db.query.raceInstances.findMany({
    where: eq(raceInstances.eventId, id),
    columns: { id: true, name: true, raceNumber: true, distance: true, surface: true, condition: true, status: true },
    with: {
      venue: { columns: { name: true } },
      // 状態バッジと頭数の表示にだけ使うため、entries は必要なカラムだけ返す
      entries: { columns: { finishPosition: true, status: true } },
    },
    orderBy: [asc(raceInstances.raceNumber), asc(raceInstances.name)],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <AdminSectionTitle>レース一覧</AdminSectionTitle>
        <Button asChild className="flex items-center gap-2 font-semibold transition active:scale-[.96]">
          <Link href={`/admin/races/new?eventId=${id}`}>
            <Plus className="h-4 w-4" />
            レースを追加
          </Link>
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <RaceListTable
          races={races}
          hrefFor={(race) => `/admin/races/${race.id}`}
          tail={{
            header: '状態',
            cell: (race) => (
              <div className="flex items-center gap-3">
                <Badge
                  variant="status"
                  label={getDisplayStatus(
                    race.status,
                    race.entries.some((e) => e.finishPosition !== null)
                  )}
                />
                <span className="text-sm text-gray-500">
                  {race.entries.filter((e) => e.status === 'ENTRANT').length}頭
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/races/${race.id}/entries`}>出走馬</Link>
                </Button>
              </div>
            ),
          }}
          emptyMessage="このイベントにはまだレースがありません"
        />
      </Card>
    </div>
  );
}
