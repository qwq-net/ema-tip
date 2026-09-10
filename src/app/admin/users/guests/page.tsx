import { getGuestCodes } from '@/features/admin/guest-codes/actions/guest-actions';
import { GuestCodeManager } from '@/features/admin/guest-codes/ui/guest-code-manager';
import { AdminPage } from '@/features/admin/ui/admin-page';
import { AdminPageHeader } from '@/shared/ui/layout/admin-page-header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ゲストユーザー管理',
};

export default async function GuestCodesPage() {
  const codes = await getGuestCodes();

  return (
    <AdminPage>
      <AdminPageHeader
        title="ゲストコード管理"
        description="ゲストユーザー用のアクセスコードの発行と管理を行います。"
      />
      <GuestCodeManager codes={codes} />
    </AdminPage>
  );
}
