import { getGuestCodes } from '@/features/admin/guest-codes/actions/guest-actions';
import { GuestCodeManager } from '@/features/admin/guest-codes/ui/guest-code-manager';
import { AdminBackLink, AdminPageHeader } from '@/features/admin/ui/admin-page-header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ゲストユーザー管理',
};

export default async function GuestCodesPage() {
  const codes = await getGuestCodes();

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-4">
          <AdminBackLink href="/admin/users">ユーザー一覧に戻る</AdminBackLink>
        </div>
        <AdminPageHeader
          title="ゲストコード管理"
          description="ゲストユーザー用のアクセスコードの発行と管理を行います。"
        />
      </div>

      <GuestCodeManager codes={codes} />
    </div>
  );
}
