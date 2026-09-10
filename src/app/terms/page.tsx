import { TermsOfService } from '@/features/legal/ui/terms-of-service';
import { PageContainer } from '@/shared/ui/layout/page-container';
import { PageHeader } from '@/shared/ui/layout/page-header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '利用規約',
};

export default function TermsPage() {
  return (
    <PageContainer width="narrow">
      <PageHeader title="利用規約" />
      <TermsOfService />
    </PageContainer>
  );
}
