import { getGlobalStats } from '@/features/stats';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { PageContainer } from '@/shared/ui/layout/page-container';
import { PageHeader } from '@/shared/ui/layout/page-header';
import { requireLoginPage } from '@/shared/utils/admin';
import { StatsDashboard } from '@/widgets/stats-dashboard/ui/stats-dashboard';

export default async function StatsPage() {
  await requireLoginPage();
  const stats = await getGlobalStats();

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'マイページ', href: '/mypage' }, { label: '戦績ダッシュボード' }]} />
      <PageHeader title="戦績ダッシュボード" />
      <StatsDashboard stats={stats} />
    </PageContainer>
  );
}
