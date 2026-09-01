import { updateSystemDefaultOdds } from '@/features/admin/manage-settings/actions';
import { AdminBackLink, AdminPageHeader, AdminSectionTitle } from '@/features/admin/ui/admin-page-header';
import { db } from '@/shared/db';
import { Card, CardContent, CardHeader } from '@/shared/ui';
import { redirect } from 'next/navigation';

import { OddsForm } from './odds-form';

export default async function DefaultOddsSettingsPage() {
  const guaranteedOddsMaster = await db.query.guaranteedOddsMaster.findMany();

  const defaultOdds = guaranteedOddsMaster.reduce<Record<string, number>>((acc, item) => {
    acc[item.key] = Number(item.odds);
    return acc;
  }, {});

  async function updateOdds(formData: FormData) {
    'use server';
    const oddsStr = formData.get('odds');
    if (!oddsStr) return;

    const odds = JSON.parse(oddsStr.toString());
    await updateSystemDefaultOdds(odds);
    redirect('/admin');
  }

  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mb-6">
        <AdminBackLink href="/admin">ダッシュボードへ戻る</AdminBackLink>
      </div>

      <div className="mb-8">
        <AdminPageHeader
          title="デフォルト保証オッズ設定"
          description="システム全体のデフォルト保証オッズを設定します。"
        />
      </div>

      <Card>
        <CardHeader>
          <AdminSectionTitle>保証オッズ設定値</AdminSectionTitle>
          <p className="text-sm text-gray-500">
            新規に作成されるレースに適用されるデフォルトの保証オッズを設定します。
            <br />※ 既に作成済みのレースの保証オッズは変更されません。個別に変更してください。
          </p>
        </CardHeader>
        <CardContent>
          <OddsForm initialOdds={defaultOdds} action={updateOdds} />
        </CardContent>
      </Card>
    </div>
  );
}
