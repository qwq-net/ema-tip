import { EventClaimList } from '@/features/economy/claim';
import { getEventsWithJoinStatus } from '@/features/economy/claim/queries';
import { requireLoginPage } from '@/shared/utils/admin';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'お小遣いを貰う',
};

export default async function ClaimPage() {
  const session = await requireLoginPage();

  const eventsWithJoinStatus = await getEventsWithJoinStatus(session.user.id);

  return (
    <div className="flex flex-col items-center p-4 lg:p-8">
      <div className="w-full max-w-5xl space-y-8">
        <div className="flex items-center gap-4">
          <Link
            href="/mypage"
            className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft size={16} />
            マイページへ戻る
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-semibold text-gray-900">お小遣いを貰う</h1>
          <p className="text-sm text-gray-500">開催中のイベントに参加して、軍資金を受け取りましょう。</p>
        </div>

        <section>
          <EventClaimList events={eventsWithJoinStatus} />
        </section>
      </div>
    </div>
  );
}
