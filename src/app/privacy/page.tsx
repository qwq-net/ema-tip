import { PrivacyPolicy } from '@/features/legal/ui/privacy-policy';
import { PageContainer } from '@/shared/ui/layout/page-container';
import { PageHeader } from '@/shared/ui/layout/page-header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
};

export default function PrivacyPage() {
  return (
    <PageContainer width="narrow">
      <PageHeader title="プライバシーポリシー" />
      <PrivacyPolicy />
    </PageContainer>
  );
}
