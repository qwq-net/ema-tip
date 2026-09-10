import { getSokubetDashboardData } from '@/features/betting/queries/sokubet';
import { requireLoginPage } from '@/shared/utils/admin';
import { SokubetDashboard } from '@/widgets/sokubet-dashboard/ui/sokubet-dashboard';
import { redirect } from 'next/navigation';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '即BET',
};

export default async function SokubetPage() {
  const session = await requireLoginPage();

  if (!session.user.isOnboardingCompleted) {
    redirect('/onboarding/name-change');
  }

  const eventGroups = await getSokubetDashboardData(session.user.id);

  return <SokubetDashboard eventGroups={eventGroups} />;
}
